import type { RelationModel } from '../domain/er-model';
import type { ErEdge } from './react-flow-types';
import type { ChenEdgeData, HandleSide, NodePlacement, Point, Rect } from './chen-types';

export const ENTITY_WIDTH = 148;
export const ENTITY_HEIGHT = 56;
export const ATTRIBUTE_WIDTH = 134;
export const ATTRIBUTE_HEIGHT = 46;
export const CLUSTER_WIDTH = 860;
export const CLUSTER_HEIGHT = 600;
export const RELATIONSHIP_SIZE = 68;
export const ATTRIBUTE_RADIUS_X = 138;
export const ATTRIBUTE_RADIUS_Y = 98;
export const ATTRIBUTE_RADIUS_STEP_X = 18;
export const ATTRIBUTE_RADIUS_STEP_Y = 14;
export const NODE_CLEARANCE = 14;
export const RELATIONSHIP_PARALLEL_GAP = 72;
export const RELATIONSHIP_AVOID_GAP = 120;
export const HANDLE_SIDES: HandleSide[] = ['left', 'right', 'top', 'bottom'];

export function entityNodeId(tableId: string): string {
  return `entity:${tableId}`;
}

export function attributeNodeId(tableId: string, columnId: string): string {
  return `attribute:${tableId}:${columnId}`;
}

export function relationshipNodeId(relationId: string): string {
  return `relationship:${relationId}`;
}

export function centerToPosition(center: Point, width: number, height: number): Point {
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
  };
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function normalize(point: Point): Point {
  const length = Math.hypot(point.x, point.y);

  if (length === 0) {
    return { x: 1, y: 0 };
  }

  return {
    x: point.x / length,
    y: point.y / length,
  };
}

export function offsetPoint(point: Point, direction: Point, distance: number): Point {
  return {
    x: point.x + direction.x * distance,
    y: point.y + direction.y * distance,
  };
}

function rectWithClearance(box: NodePlacement) {
  return {
    left: box.center.x - box.width / 2 - NODE_CLEARANCE,
    top: box.center.y - box.height / 2 - NODE_CLEARANCE,
    right: box.center.x + box.width / 2 + NODE_CLEARANCE,
    bottom: box.center.y + box.height / 2 + NODE_CLEARANCE,
  };
}

function boxesOverlap(left: NodePlacement, right: NodePlacement): boolean {
  const leftRect = rectWithClearance(left);
  const rightRect = rectWithClearance(right);

  return !(
    leftRect.right <= rightRect.left ||
    rightRect.right <= leftRect.left ||
    leftRect.bottom <= rightRect.top ||
    rightRect.bottom <= leftRect.top
  );
}

export function hasOverlaps(boxes: NodePlacement[]): boolean {
  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex++) {
      if (boxesOverlap(boxes[leftIndex], boxes[rightIndex])) {
        return true;
      }
    }
  }

  return false;
}

export function overlapsAny(box: NodePlacement, placements: Map<string, NodePlacement>): boolean {
  return [...placements.values()].some((placement) => boxesOverlap(box, placement));
}

export function boxFromCenter(id: string, center: Point, width: number, height: number): NodePlacement {
  return { id, center, width, height };
}

export function relationPairKey(relation: RelationModel): string {
  return [relation.sourceTableId, relation.targetTableId].sort().join('::');
}

export function countRelationsByPair(relations: RelationModel[]): Map<string, number> {
  const counts = new Map<string, number>();

  relations.forEach((relation) => {
    const pairKey = relationPairKey(relation);
    counts.set(pairKey, (counts.get(pairKey) ?? 0) + 1);
  });

  return counts;
}

export function placeAttributes(
  entityCenter: Point,
  attributeCount: number,
  preferredDegrees?: number[]
): Point[] {
  const angles =
    preferredDegrees?.slice(0, attributeCount).map(toRadians) ?? attributeAngles(attributeCount);
  let latestPositions: Point[] = [];

  for (let attempt = 0; attempt < 8; attempt++) {
    const radiusX = ATTRIBUTE_RADIUS_X + attempt * ATTRIBUTE_RADIUS_STEP_X;
    const radiusY = ATTRIBUTE_RADIUS_Y + attempt * ATTRIBUTE_RADIUS_STEP_Y;
    latestPositions = angles.map((angle) =>
      centerToPosition(
        {
          x: entityCenter.x + Math.cos(angle) * radiusX,
          y: entityCenter.y + Math.sin(angle) * radiusY,
        },
        ATTRIBUTE_WIDTH,
        ATTRIBUTE_HEIGHT
      )
    );

    const boxes = [
      {
        id: 'entity',
        center: entityCenter,
        width: ENTITY_WIDTH,
        height: ENTITY_HEIGHT,
      },
      ...latestPositions.map((position, index) => ({
        id: `attribute:${index}`,
        center: {
          x: position.x + ATTRIBUTE_WIDTH / 2,
          y: position.y + ATTRIBUTE_HEIGHT / 2,
        },
        width: ATTRIBUTE_WIDTH,
        height: ATTRIBUTE_HEIGHT,
      })),
    ];

    if (!hasOverlaps(boxes)) {
      return latestPositions;
    }
  }

  return latestPositions;
}

function attributeAngles(attributeCount: number): number[] {
  if (attributeCount === 0) {
    return [];
  }

  if (attributeCount === 1) {
    return [toRadians(-90)];
  }

  if (attributeCount === 2) {
    return [toRadians(-140), toRadians(-30)];
  }

  return Array.from({ length: attributeCount }, (_, index) =>
    toRadians(-90 + (360 * index) / attributeCount)
  );
}

export function placeRelationship(
  relation: RelationModel,
  relationCounts: Map<string, number>,
  usedRelationIndexes: Map<string, number>,
  placements: Map<string, NodePlacement>
): Point {
  const source = placements.get(entityNodeId(relation.sourceTableId));
  const target = placements.get(entityNodeId(relation.targetTableId));

  if (!source || !target) {
    return { x: 0, y: 0 };
  }

  const pairKey = relationPairKey(relation);
  const usedIndex = usedRelationIndexes.get(pairKey) ?? 0;
  usedRelationIndexes.set(pairKey, usedIndex + 1);

  const totalForPair = relationCounts.get(pairKey) ?? 1;
  const offsetIndex = usedIndex - (totalForPair - 1) / 2;
  const vector = normalize({
    x: target.center.x - source.center.x,
    y: target.center.y - source.center.y,
  });
  const perpendicular = { x: -vector.y, y: vector.x };
  const midpoint = {
    x:
      (source.center.x + target.center.x) / 2 +
      perpendicular.x * offsetIndex * RELATIONSHIP_PARALLEL_GAP,
    y:
      (source.center.y + target.center.y) / 2 +
      perpendicular.y * offsetIndex * RELATIONSHIP_PARALLEL_GAP,
  };
  const candidates = [
    midpoint,
    offsetPoint(midpoint, perpendicular, RELATIONSHIP_AVOID_GAP),
    offsetPoint(midpoint, perpendicular, -RELATIONSHIP_AVOID_GAP),
    offsetPoint(midpoint, perpendicular, RELATIONSHIP_AVOID_GAP * 2),
    offsetPoint(midpoint, perpendicular, -RELATIONSHIP_AVOID_GAP * 2),
    offsetPoint(midpoint, vector, RELATIONSHIP_AVOID_GAP),
    offsetPoint(midpoint, vector, -RELATIONSHIP_AVOID_GAP),
  ];

  return (
    candidates.find(
      (candidate) =>
        !overlapsAny(
          boxFromCenter('relationship', candidate, RELATIONSHIP_SIZE, RELATIONSHIP_SIZE),
          placements
        )
    ) ?? midpoint
  );
}

export function placeAssociativeRelationship(
  associativeRelations: { targetTableId: string }[],
  placements: Map<string, NodePlacement>
): Point {
  const entityPlacements = associativeRelations
    .map((relation) => placements.get(entityNodeId(relation.targetTableId)))
    .filter((placement): placement is NodePlacement => Boolean(placement));

  if (entityPlacements.length === 0) {
    return { x: 0, y: 0 };
  }

  const center = {
    x:
      entityPlacements.reduce((sum, placement) => sum + placement.center.x, 0) /
      entityPlacements.length,
    y:
      entityPlacements.reduce((sum, placement) => sum + placement.center.y, 0) /
      entityPlacements.length,
  };
  const candidates = [
    center,
    offsetPoint(center, { x: 0, y: 1 }, RELATIONSHIP_AVOID_GAP),
    offsetPoint(center, { x: 0, y: -1 }, RELATIONSHIP_AVOID_GAP),
    offsetPoint(center, { x: 1, y: 0 }, RELATIONSHIP_AVOID_GAP),
    offsetPoint(center, { x: -1, y: 0 }, RELATIONSHIP_AVOID_GAP),
  ];

  return (
    candidates.find(
      (candidate) =>
        !overlapsAny(
          boxFromCenter('relationship', candidate, RELATIONSHIP_SIZE, RELATIONSHIP_SIZE),
          placements
        )
    ) ?? center
  );
}

export function createStraightEdge(
  id: string,
  source: string,
  target: string,
  data: ChenEdgeData,
  placements: Map<string, NodePlacement>
): ErEdge {
  const sourcePlacement = placements.get(source);
  const targetPlacement = placements.get(target);
  const handles =
    sourcePlacement && targetPlacement
      ? chooseStraightEdgeHandles(sourcePlacement, targetPlacement, placements)
      : { sourceHandle: undefined, targetHandle: undefined };

  return {
    id,
    type: 'relationship',
    source,
    target,
    sourceHandle: handles.sourceHandle,
    targetHandle: handles.targetHandle,
    data: { ...data, edgeStyle: 'straight' },
  };
}

function chooseStraightEdgeHandles(
  source: NodePlacement,
  target: NodePlacement,
  placements: Map<string, NodePlacement>
): { sourceHandle: string; targetHandle: string } {
  const preferredSourceSide = sideFor(source, target);
  const preferredTargetSide = sideFor(target, source);
  let sourceSide = preferredSourceSide;
  let targetSide = preferredTargetSide;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidateSourceSide of orderedHandleSides(preferredSourceSide)) {
    for (const candidateTargetSide of orderedHandleSides(preferredTargetSide)) {
      const start = handlePoint(source, candidateSourceSide);
      const end = handlePoint(target, candidateTargetSide);
      const crossedNodeCount = countNodesCrossedBySegment(
        start,
        end,
        source.id,
        target.id,
        placements
      );
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const sourcePenalty = candidateSourceSide === preferredSourceSide ? 0 : 1;
      const targetPenalty = candidateTargetSide === preferredTargetSide ? 0 : 1;
      const score =
        crossedNodeCount * 100_000 + sourcePenalty * 1_000 + targetPenalty * 1_000 + length;

      if (score < bestScore) {
        sourceSide = candidateSourceSide;
        targetSide = candidateTargetSide;
        bestScore = score;
      }
    }
  }

  return {
    sourceHandle: `source:${sourceSide}`,
    targetHandle: `target:${targetSide}`,
  };
}

function orderedHandleSides(preferred: HandleSide): HandleSide[] {
  return [preferred, ...HANDLE_SIDES.filter((side) => side !== preferred)];
}

function sideFor(from: NodePlacement, to: NodePlacement): HandleSide {
  const dx = to.center.x - from.center.x;
  const dy = to.center.y - from.center.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }

  return dy >= 0 ? 'bottom' : 'top';
}

function handlePoint(placement: NodePlacement, side: HandleSide): Point {
  if (placement.id.startsWith('relationship:')) {
    return rotatedRelationshipHandlePoint(placement, side);
  }

  if (side === 'left') {
    return { x: placement.center.x - placement.width / 2, y: placement.center.y };
  }

  if (side === 'right') {
    return { x: placement.center.x + placement.width / 2, y: placement.center.y };
  }

  if (side === 'top') {
    return { x: placement.center.x, y: placement.center.y - placement.height / 2 };
  }

  return { x: placement.center.x, y: placement.center.y + placement.height / 2 };
}

function rotatedRelationshipHandlePoint(placement: NodePlacement, side: HandleSide): Point {
  const offset =
    side === 'left'
      ? { x: -placement.width / 2, y: 0 }
      : side === 'right'
        ? { x: placement.width / 2, y: 0 }
        : side === 'top'
          ? { x: 0, y: -placement.height / 2 }
          : { x: 0, y: placement.height / 2 };
  const angle = Math.PI / 4;
  const rotatedOffset = {
    x: offset.x * Math.cos(angle) - offset.y * Math.sin(angle),
    y: offset.x * Math.sin(angle) + offset.y * Math.cos(angle),
  };

  return {
    x: placement.center.x + rotatedOffset.x,
    y: placement.center.y + rotatedOffset.y,
  };
}

function countNodesCrossedBySegment(
  start: Point,
  end: Point,
  sourceId: string,
  targetId: string,
  placements: Map<string, NodePlacement>
): number {
  return [...placements.values()].filter(
    (placement) =>
      placement.id !== sourceId &&
      placement.id !== targetId &&
      segmentIntersectsRect(start, end, rectWithClearance(placement))
  ).length;
}

function segmentIntersectsRect(start: Point, end: Point, rect: Rect): boolean {
  if (pointInsideRect(start, rect) || pointInsideRect(end, rect)) {
    return true;
  }

  return (
    [
      [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
      ],
      [
        { x: rect.right, y: rect.top },
        { x: rect.right, y: rect.bottom },
      ],
      [
        { x: rect.right, y: rect.bottom },
        { x: rect.left, y: rect.bottom },
      ],
      [
        { x: rect.left, y: rect.bottom },
        { x: rect.left, y: rect.top },
      ],
    ] as Array<[Point, Point]>
  ).some(([rectStart, rectEnd]) => segmentsIntersect(start, end, rectStart, rectEnd));
}

function pointInsideRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function segmentsIntersect(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point
): boolean {
  const firstDirection = direction(firstStart, firstEnd, secondStart);
  const secondDirection = direction(firstStart, firstEnd, secondEnd);
  const thirdDirection = direction(secondStart, secondEnd, firstStart);
  const fourthDirection = direction(secondStart, secondEnd, firstEnd);

  if (firstDirection === 0 && pointOnSegment(secondStart, firstStart, firstEnd)) {
    return true;
  }

  if (secondDirection === 0 && pointOnSegment(secondEnd, firstStart, firstEnd)) {
    return true;
  }

  if (thirdDirection === 0 && pointOnSegment(firstStart, secondStart, secondEnd)) {
    return true;
  }

  if (fourthDirection === 0 && pointOnSegment(firstEnd, secondStart, secondEnd)) {
    return true;
  }

  return firstDirection * secondDirection < 0 && thirdDirection * fourthDirection < 0;
}

function direction(origin: Point, target: Point, point: Point): number {
  const crossProduct =
    (target.x - origin.x) * (point.y - origin.y) - (target.y - origin.y) * (point.x - origin.x);

  if (Math.abs(crossProduct) < 0.001) {
    return 0;
  }

  return crossProduct > 0 ? 1 : -1;
}

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  return (
    point.x >= Math.min(start.x, end.x) &&
    point.x <= Math.max(start.x, end.x) &&
    point.y >= Math.min(start.y, end.y) &&
    point.y <= Math.max(start.y, end.y)
  );
}
