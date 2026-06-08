import type { ErModel, RelationModel, TableModel } from '../domain/er-model';
import { oneOrManyLabel } from '../domain/display-labels';
import type { ErEdge, ErNode, FlowGraph } from './react-flow-types';

const ENTITY_WIDTH = 170;
const ENTITY_HEIGHT = 64;
const ATTRIBUTE_WIDTH = 150;
const ATTRIBUTE_HEIGHT = 58;
const RELATIONSHIP_SIZE = 112;
const CLUSTER_WIDTH = 860;
const CLUSTER_HEIGHT = 600;
const ATTRIBUTE_RADIUS_X = 245;
const ATTRIBUTE_RADIUS_Y = 168;
const ATTRIBUTE_RADIUS_STEP_X = 28;
const ATTRIBUTE_RADIUS_STEP_Y = 20;
const NODE_CLEARANCE = 18;
const RELATIONSHIP_PARALLEL_GAP = 92;
const RELATIONSHIP_AVOID_GAP = 154;

type Point = {
  x: number;
  y: number;
};

type NodePlacement = {
  id: string;
  center: Point;
  width: number;
  height: number;
};

type ChenEdgeData = {
  relation?: RelationModel;
  label: string;
  inferred: boolean;
};

export function toChenFlow(model: ErModel): FlowGraph {
  const nodes: ErNode[] = [];
  const edges: ErEdge[] = [];
  const placements = new Map<string, NodePlacement>();
  const relationList = [...model.relations, ...model.inferredRelations];
  const entityColumns = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(model.tables.length))));

  model.tables.forEach((table, tableIndex) => {
    addNode(toEntityNode(table, tableIndex, entityColumns), nodes, placements);
  });

  model.tables.forEach((table) => {
    const entityId = entityNodeId(table.id);
    const entityPlacement = placements.get(entityId);

    if (!entityPlacement) {
      return;
    }

    const attributePositions = placeAttributes(entityPlacement.center, table.columns.length);

    table.columns.forEach((column, columnIndex) => {
      const attributeId = attributeNodeId(table.id, column.id);
      addNode(
        {
          id: attributeId,
          type: 'chenAttribute',
          position: attributePositions[columnIndex],
          width: ATTRIBUTE_WIDTH,
          height: ATTRIBUTE_HEIGHT,
          data: { table, column },
        },
        nodes,
        placements
      );
      edges.push(createStraightEdge(`edge:${entityId}:${attributeId}`, entityId, attributeId, { label: '', inferred: false }, placements));
    });
  });

  const relationCounts = countRelationsByPair(relationList);
  const usedRelationIndexes = new Map<string, number>();

  relationList.forEach((relation) => {
    const relationshipId = relationshipNodeId(relation.id);
    const relationshipCenter = placeRelationship(relation, relationCounts, usedRelationIndexes, placements);
    addNode(
      {
        id: relationshipId,
        type: 'chenRelationship',
        position: centerToPosition(relationshipCenter, RELATIONSHIP_SIZE, RELATIONSHIP_SIZE),
        width: RELATIONSHIP_SIZE,
        height: RELATIONSHIP_SIZE,
        data: { relation },
      },
      nodes,
      placements
    );

    edges.push({
      ...createStraightEdge(
        `edge:${entityNodeId(relation.sourceTableId)}:${relationshipId}`,
        entityNodeId(relation.sourceTableId),
        relationshipId,
        {
          relation,
          label: sourceCardinalityLabel(relation),
          inferred: relation.source !== 'foreign-key',
        },
        placements
      ),
    });
    edges.push({
      ...createStraightEdge(
        `edge:${relationshipId}:${entityNodeId(relation.targetTableId)}`,
        relationshipId,
        entityNodeId(relation.targetTableId),
        {
          relation,
          label: targetCardinalityLabel(relation),
          inferred: relation.source !== 'foreign-key',
        },
        placements
      ),
    });
  });

  return { nodes, edges, layoutStrategy: 'manual' };
}

function toEntityNode(table: TableModel, index: number, columnCount: number): ErNode {
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;
  const center = {
    x: column * CLUSTER_WIDTH + CLUSTER_WIDTH / 2,
    y: row * CLUSTER_HEIGHT + CLUSTER_HEIGHT / 2,
  };

  return {
    id: entityNodeId(table.id),
    type: 'chenEntity',
    position: centerToPosition(center, ENTITY_WIDTH, ENTITY_HEIGHT),
    width: ENTITY_WIDTH,
    height: ENTITY_HEIGHT,
    data: { table },
  };
}

function addNode(node: ErNode, nodes: ErNode[], placements: Map<string, NodePlacement>): void {
  nodes.push(node);
  placements.set(node.id, {
    id: node.id,
    center: {
      x: node.position.x + (node.width ?? ENTITY_WIDTH) / 2,
      y: node.position.y + (node.height ?? ENTITY_HEIGHT) / 2,
    },
    width: node.width ?? ENTITY_WIDTH,
    height: node.height ?? ENTITY_HEIGHT,
  });
}

function placeAttributes(entityCenter: Point, attributeCount: number): Point[] {
  const angles = attributeAngles(attributeCount);
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

  return Array.from({ length: attributeCount }, (_, index) => toRadians(-90 + (360 * index) / attributeCount));
}

function placeRelationship(
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
    x: (source.center.x + target.center.x) / 2 + perpendicular.x * offsetIndex * RELATIONSHIP_PARALLEL_GAP,
    y: (source.center.y + target.center.y) / 2 + perpendicular.y * offsetIndex * RELATIONSHIP_PARALLEL_GAP,
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
    candidates.find((candidate) => !overlapsAny(boxFromCenter('relationship', candidate, RELATIONSHIP_SIZE, RELATIONSHIP_SIZE), placements)) ??
    midpoint
  );
}

function countRelationsByPair(relations: RelationModel[]): Map<string, number> {
  const counts = new Map<string, number>();

  relations.forEach((relation) => {
    const pairKey = relationPairKey(relation);
    counts.set(pairKey, (counts.get(pairKey) ?? 0) + 1);
  });

  return counts;
}

function createStraightEdge(
  id: string,
  source: string,
  target: string,
  data: ChenEdgeData,
  placements: Map<string, NodePlacement>
): ErEdge {
  const sourcePlacement = placements.get(source);
  const targetPlacement = placements.get(target);

  return {
    id,
    type: 'relationship',
    source,
    target,
    sourceHandle: sourcePlacement && targetPlacement ? sideHandleId('source', sourcePlacement, targetPlacement) : undefined,
    targetHandle: sourcePlacement && targetPlacement ? sideHandleId('target', targetPlacement, sourcePlacement) : undefined,
    data: { ...data, edgeStyle: 'straight' },
  };
}

function sideHandleId(type: 'source' | 'target', from: NodePlacement, to: NodePlacement): string {
  const dx = to.center.x - from.center.x;
  const dy = to.center.y - from.center.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? `${type}:right` : `${type}:left`;
  }

  return dy >= 0 ? `${type}:bottom` : `${type}:top`;
}

function relationPairKey(relation: RelationModel): string {
  return [relation.sourceTableId, relation.targetTableId].sort().join('::');
}

function centerToPosition(center: Point, width: number, height: number): Point {
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function normalize(point: Point): Point {
  const length = Math.hypot(point.x, point.y);

  if (length === 0) {
    return { x: 1, y: 0 };
  }

  return {
    x: point.x / length,
    y: point.y / length,
  };
}

function offsetPoint(point: Point, direction: Point, distance: number): Point {
  return {
    x: point.x + direction.x * distance,
    y: point.y + direction.y * distance,
  };
}

function hasOverlaps(boxes: NodePlacement[]): boolean {
  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex++) {
      if (boxesOverlap(boxes[leftIndex], boxes[rightIndex])) {
        return true;
      }
    }
  }

  return false;
}

function overlapsAny(box: NodePlacement, placements: Map<string, NodePlacement>): boolean {
  return [...placements.values()].some((placement) => boxesOverlap(box, placement));
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

function rectWithClearance(box: NodePlacement) {
  return {
    left: box.center.x - box.width / 2 - NODE_CLEARANCE,
    top: box.center.y - box.height / 2 - NODE_CLEARANCE,
    right: box.center.x + box.width / 2 + NODE_CLEARANCE,
    bottom: box.center.y + box.height / 2 + NODE_CLEARANCE,
  };
}

function boxFromCenter(id: string, center: Point, width: number, height: number): NodePlacement {
  return { id, center, width, height };
}

function entityNodeId(tableId: string): string {
  return `entity:${tableId}`;
}

function attributeNodeId(tableId: string, columnId: string): string {
  return `attribute:${tableId}:${columnId}`;
}

function relationshipNodeId(relationId: string): string {
  return `relationship:${relationId}`;
}

function sourceCardinalityLabel(relation: RelationModel): string {
  return oneOrManyLabel(!(relation.cardinality === 'one-to-one' || relation.cardinality === 'one-to-many'));
}

function targetCardinalityLabel(relation: RelationModel): string {
  return oneOrManyLabel(!(relation.cardinality === 'one-to-one' || relation.cardinality === 'many-to-one'));
}
