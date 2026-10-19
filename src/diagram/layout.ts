import type { ErNode, FlowGraph } from './react-flow-types';
import {
  ATTRIBUTE_HEIGHT,
  ATTRIBUTE_WIDTH,
  ENTITY_HEIGHT,
  ENTITY_WIDTH,
  RELATIONSHIP_SIZE,
  centerToPosition,
  normalize,
  offsetPoint,
  placeAttributes,
} from './chen-geometry';
import { segmentIntersectsRect, segmentsIntersect } from './geometry-utils';

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 120;
const NODE_PADDING = 8;

const CHEN_ATTRIBUTE_TYPE = 'chenAttribute';
const CHEN_ENTITY_TYPE = 'chenEntity';
const CHEN_RELATIONSHIP_TYPE = 'chenRelationship';

const ATTRIBUTE_ANGLE_STEP = 30;
const ATTRIBUTE_ANGLE_SLOTS = 12;
const ATTRIBUTE_RADIUS_STEPS = [1, 1.2, 1.4, 1.6, 1.8, 2];
const ATTRIBUTE_CLEARANCE = 16;
const ATTRIBUTE_EDGE_CLEARANCE = 10;

const CHEN_HUB_MAX_ENTITIES = 7;
const HUB_COLUMN_GAP = 380;
const HUB_ROW_GAP = 240;
const RELATIONSHIP_PARALLEL_OFFSET = 84;
const RELATIONSHIP_PLACEMENT_STEP = 100;

type Segment = {
  start: Point;
  end: Point;
};

type ElkChild = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type Point = {
  x: number;
  y: number;
};

type Placement = {
  center: Point;
  width: number;
  height: number;
};

export async function applyElkLayout(graph: FlowGraph): Promise<FlowGraph> {
  const hasChenAttributes = graph.nodes.some((node) => node.type === CHEN_ATTRIBUTE_TYPE);

  if (hasChenAttributes) {
    return applyChenLayout(graph);
  }

  return applySimpleElkLayout(graph);
}

async function applySimpleElkLayout(graph: FlowGraph): Promise<FlowGraph> {
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js');
  const elk = new ELK();
  const layouted = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '90',
      'elk.spacing.edgeNode': '48',
      'elk.layered.spacing.nodeNodeBetweenLayers': '140',
      'elk.layered.spacing.edgeNodeBetweenLayers': '56',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: graph.nodes.map((node) => ({
      id: node.id,
      width: node.width ?? DEFAULT_NODE_WIDTH,
      height: node.height ?? DEFAULT_NODE_HEIGHT,
    })),
    edges: graph.edges
      .filter(
        (edge) =>
          graph.nodes.some((node) => node.id === edge.source) &&
          graph.nodes.some((node) => node.id === edge.target)
      )
      .map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
  });

  const childMap = new Map<string, ElkChild>(
    (layouted.children ?? []).map((child: ElkChild) => [child.id, child])
  );

  return {
    nodes: graph.nodes.map((node) => {
      const layout = childMap.get(node.id);
      return {
        ...node,
        position: {
          x: Math.max(0, layout?.x ?? node.position.x),
          y: Math.max(0, layout?.y ?? node.position.y),
        },
        width: layout?.width ?? node.width ?? DEFAULT_NODE_WIDTH,
        height: layout?.height ?? node.height ?? DEFAULT_NODE_HEIGHT,
      };
    }),
    edges: graph.edges,
  };
}

/**
 * 陈氏图自动整理分两条路径：
 * - 小图（≤7 个实体）走教材式「枢纽—辐条」布局：度数最高的实体在左，其余实体在右列，
 *   关系菱形落在连线中点，属性朝图外呈扇形展开。
 * - 大图继续用 ELK stress，避免右列过长。
 */
async function applyChenLayout(graph: FlowGraph): Promise<FlowGraph> {
  const entityCount = graph.nodes.filter((node) => node.type === CHEN_ENTITY_TYPE).length;

  if (entityCount >= 2 && entityCount <= CHEN_HUB_MAX_ENTITIES) {
    return applyChenHubLayout(graph);
  }

  return applyChenStressLayout(graph);
}

function applyChenHubLayout(graph: FlowGraph): FlowGraph {
  const entityNodes = graph.nodes.filter((node) => node.type === CHEN_ENTITY_TYPE);
  const relationshipNodes = graph.nodes.filter((node) => node.type === CHEN_RELATIONSHIP_TYPE);
  const attributeNodes = graph.nodes.filter((node) => node.type === CHEN_ATTRIBUTE_TYPE);

  const entityIds = new Set(entityNodes.map((node) => node.id));
  const relationshipIds = new Set(relationshipNodes.map((node) => node.id));
  const attributeIds = new Set(attributeNodes.map((node) => node.id));

  const entityNeighbors = new Map<string, string[]>();
  const parentByAttribute = new Map<string, string>();

  graph.edges.forEach((edge) => {
    if (relationshipIds.has(edge.source) && entityIds.has(edge.target)) {
      entityNeighbors.set(edge.source, [...(entityNeighbors.get(edge.source) ?? []), edge.target]);
    } else if (entityIds.has(edge.source) && relationshipIds.has(edge.target)) {
      entityNeighbors.set(edge.target, [...(entityNeighbors.get(edge.target) ?? []), edge.source]);
    }

    if (attributeIds.has(edge.target) && (entityIds.has(edge.source) || relationshipIds.has(edge.source))) {
      parentByAttribute.set(edge.target, edge.source);
    }
  });

  const degree = new Map<string, number>();
  entityIds.forEach((id) => degree.set(id, 0));
  entityNeighbors.forEach((neighbors) => {
    neighbors.forEach((id) => degree.set(id, (degree.get(id) ?? 0) + 1));
  });

  const hub = [...entityNodes].sort((left, right) => {
    const diff = (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0);
    return diff !== 0 ? diff : left.id.localeCompare(right.id);
  })[0];

  const others = entityNodes.filter((node) => node.id !== hub.id);
  const orderedOthers = optimizeHubOrder(hub, others, entityNeighbors);

  const centers = new Map<string, Point>();
  centers.set(hub.id, { x: 0, y: 0 });
  orderedOthers.forEach((node, index) => {
    centers.set(node.id, {
      x: HUB_COLUMN_GAP,
      y: (index - (orderedOthers.length - 1) / 2) * HUB_ROW_GAP,
    });
  });

  const placements = new Map<string, Placement>();
  const occupied: Box[] = [];
  const placedEntities = entityNodes.map((node) => {
    const center = centers.get(node.id) ?? { x: 0, y: 0 };
    const width = node.width ?? ENTITY_WIDTH;
    const height = node.height ?? ENTITY_HEIGHT;
    const positioned = {
      ...node,
      position: centerToPosition(center, width, height),
      width,
      height,
    };

    placements.set(node.id, { center, width, height });
    occupied.push({ x: positioned.position.x, y: positioned.position.y, w: width, h: height });

    return positioned;
  });

  const pairCounts = new Map<string, number>();
  relationshipNodes.forEach((node) => {
    const neighbors = entityNeighbors.get(node.id) ?? [];
    if (neighbors.length === 2) {
      const key = [...neighbors].sort().join('::');
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }
  });

  const pairUsed = new Map<string, number>();
  const placedRelationships = relationshipNodes.map((node) => {
    const neighbors = entityNeighbors.get(node.id) ?? [];
    const width = node.width ?? RELATIONSHIP_SIZE;
    const height = node.height ?? RELATIONSHIP_SIZE;
    let center: Point = { x: 0, y: 0 };

    if (neighbors.length === 2) {
      const start = placements.get(neighbors[0]);
      const end = placements.get(neighbors[1]);

      if (start && end) {
        const key = [...neighbors].sort().join('::');
        const total = pairCounts.get(key) ?? 1;
        const index = pairUsed.get(key) ?? 0;
        pairUsed.set(key, index + 1);
        center = findRelationshipCenter(
          start.center,
          end.center,
          index - (total - 1) / 2,
          width,
          height,
          occupied
        );
      }
    }

    const positioned = {
      ...node,
      position: centerToPosition(center, width, height),
      width,
      height,
    };

    placements.set(node.id, { center, width, height });
    occupied.push({ x: positioned.position.x, y: positioned.position.y, w: width, h: height });

    return positioned;
  });

  const coreSegments = buildCoreSegments(graph, placements);
  const centroid = averageCenter([...placements.values()].map((placement) => placement.center));
  const attributesByParent = new Map<string, ErNode[]>();

  attributeNodes.forEach((attribute) => {
    const parentId = parentByAttribute.get(attribute.id);
    if (!parentId) {
      return;
    }

    attributesByParent.set(parentId, [...(attributesByParent.get(parentId) ?? []), attribute]);
  });

  const placedAttributes: ErNode[] = [];

  [...attributesByParent.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([parentId, attributes]) => {
      const parent = placements.get(parentId);
      if (!parent) {
        return;
      }

      const baseAngle = attributeBaseAngle(
        parentId,
        parent,
        entityIds,
        entityNeighbors,
        placements,
        centroid
      );
      const positions = placeAttributes(
        parent.center,
        attributes.length,
        fanAngles(attributes.length, baseAngle)
      );

      attributes.forEach((attribute, index) => {
        const width = attribute.width ?? ATTRIBUTE_WIDTH;
        const height = attribute.height ?? ATTRIBUTE_HEIGHT;
        const { position, box } = findFreeAttributeSlot(
          parent.center,
          positions[index] ?? attribute.position,
          width,
          height,
          occupied,
          coreSegments
        );

        placedAttributes.push({ ...attribute, position });
        occupied.push(box);
      });
    });

  const detachedAttributes = attributeNodes.filter(
    (attribute) => !parentByAttribute.has(attribute.id)
  );

  return {
    nodes: [...placedEntities, ...placedRelationships, ...placedAttributes, ...detachedAttributes],
    edges: graph.edges,
  };
}

function optimizeHubOrder(
  hub: ErNode,
  others: ErNode[],
  entityNeighbors: Map<string, string[]>
): ErNode[] {
  if (others.length < 2) {
    return others;
  }

  const pairs = buildEntityPairs(entityNeighbors);
  let best = others;
  let bestCost = hubOrderCost(hub, others, pairs);

  if (others.length <= 6) {
    for (const candidate of permutations(others)) {
      const cost = hubOrderCost(hub, candidate, pairs);
      if (cost < bestCost) {
        best = candidate;
        bestCost = cost;
      }
    }
  }

  return best;
}

function hubOrderCost(hub: ErNode, order: ErNode[], pairs: Array<[string, string]>): number {
  const centers = new Map<string, Point>();
  centers.set(hub.id, { x: 0, y: 0 });
  order.forEach((node, index) => {
    centers.set(node.id, {
      x: HUB_COLUMN_GAP,
      y: (index - (order.length - 1) / 2) * HUB_ROW_GAP,
    });
  });

  const segments: Array<{ source: string; target: string; start: Point; end: Point }> = [];
  pairs.forEach(([source, target]) => {
    const start = centers.get(source);
    const end = centers.get(target);
    if (start && end) {
      segments.push({ source, target, start, end });
    }
  });

  let cost = 0;

  for (let left = 0; left < segments.length; left++) {
    for (let right = left + 1; right < segments.length; right++) {
      const first = segments[left];
      const second = segments[right];
      const sharesEndpoint =
        first.source === second.source ||
        first.source === second.target ||
        first.target === second.source ||
        first.target === second.target;

      if (
        !sharesEndpoint &&
        segmentsIntersect(first.start, first.end, second.start, second.end)
      ) {
        cost += 100;
      }
    }
  }

  segments.forEach((segment) => {
    centers.forEach((center, entityId) => {
      if (entityId === segment.source || entityId === segment.target) {
        return;
      }

      const rect = {
        left: center.x - ENTITY_WIDTH / 2 - 10,
        top: center.y - ENTITY_HEIGHT / 2 - 10,
        right: center.x + ENTITY_WIDTH / 2 + 10,
        bottom: center.y + ENTITY_HEIGHT / 2 + 10,
      };

      if (segmentIntersectsRect(segment.start, segment.end, rect)) {
        cost += 100;
      }
    });
  });

  return cost;
}

function buildEntityPairs(entityNeighbors: Map<string, string[]>): Array<[string, string]> {
  const seen = new Set<string>();
  const pairs: Array<[string, string]> = [];

  entityNeighbors.forEach((neighbors) => {
    if (neighbors.length !== 2) {
      return;
    }

    const key = [...neighbors].sort().join('::');
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    pairs.push([neighbors[0], neighbors[1]]);
  });

  return pairs;
}

function findRelationshipCenter(
  start: Point,
  end: Point,
  offsetIndex: number,
  width: number,
  height: number,
  occupied: Box[]
): Point {
  const vector = normalize({ x: end.x - start.x, y: end.y - start.y });
  const perpendicular = { x: -vector.y, y: vector.x };
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const base = offsetPoint(midpoint, perpendicular, offsetIndex * RELATIONSHIP_PARALLEL_OFFSET);
  const candidates = [
    base,
    offsetPoint(base, perpendicular, RELATIONSHIP_PLACEMENT_STEP),
    offsetPoint(base, perpendicular, -RELATIONSHIP_PLACEMENT_STEP),
    offsetPoint(base, perpendicular, RELATIONSHIP_PLACEMENT_STEP * 2),
    offsetPoint(base, perpendicular, -RELATIONSHIP_PLACEMENT_STEP * 2),
    offsetPoint(base, vector, RELATIONSHIP_PLACEMENT_STEP),
    offsetPoint(base, vector, -RELATIONSHIP_PLACEMENT_STEP),
  ];

  return (
    candidates.find(
      (candidate) => !collidesWithAny(boxFromCenter(candidate, width, height), occupied)
    ) ?? base
  );
}

function attributeBaseAngle(
  parentId: string,
  parent: Placement,
  entityIds: Set<string>,
  entityNeighbors: Map<string, string[]>,
  placements: Map<string, Placement>,
  centroid: Point
): number {
  if (entityIds.has(parentId)) {
    const directions: Point[] = [];

    entityNeighbors.forEach((neighbors, relationshipId) => {
      if (!neighbors.includes(parentId)) {
        return;
      }

      const relationship = placements.get(relationshipId);
      if (relationship) {
        directions.push(
          normalize({
            x: relationship.center.x - parent.center.x,
            y: relationship.center.y - parent.center.y,
          })
        );
      }
    });

    return chooseOutwardAngle(parent.center, directions, centroid);
  }

  const neighbors = entityNeighbors.get(parentId) ?? [];
  if (neighbors.length === 2) {
    const start = placements.get(neighbors[0])?.center;
    const end = placements.get(neighbors[1])?.center;

    if (start && end) {
      const vector = normalize({ x: end.x - start.x, y: end.y - start.y });
      let perpendicular = { x: -vector.y, y: vector.x };
      const toCenter = { x: parent.center.x - centroid.x, y: parent.center.y - centroid.y };

      if (perpendicular.x * toCenter.x + perpendicular.y * toCenter.y < 0) {
        perpendicular = { x: -perpendicular.x, y: -perpendicular.y };
      }

      return (Math.atan2(perpendicular.y, perpendicular.x) * 180) / Math.PI;
    }
  }

  return 90;
}

/** 在 24 个方向里挑一个离所有连线最远、又朝向图外的角度。 */
function chooseOutwardAngle(center: Point, directions: Point[], centroid: Point): number {
  const outward = normalize({ x: center.x - centroid.x, y: center.y - centroid.y });
  let bestAngle = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let degrees = 0; degrees < 360; degrees += 15) {
    const radians = (degrees * Math.PI) / 180;
    const candidate = { x: Math.cos(radians), y: Math.sin(radians) };
    let clearance = 180;

    directions.forEach((direction) => {
      const dot = Math.min(
        1,
        Math.max(-1, candidate.x * direction.x + candidate.y * direction.y)
      );
      clearance = Math.min(clearance, (Math.acos(dot) * 180) / Math.PI);
    });

    const outwardBias = candidate.x * outward.x + candidate.y * outward.y;
    const score = clearance + outwardBias * 20;

    if (score > bestScore) {
      bestScore = score;
      bestAngle = degrees;
    }
  }

  return bestAngle;
}

function fanAngles(count: number, baseDegrees: number): number[] {
  if (count <= 1) {
    return [baseDegrees];
  }

  const spread = count === 2 ? 60 : Math.min(150, 34 * (count - 1));
  return Array.from(
    { length: count },
    (_, index) => baseDegrees - spread / 2 + (spread * index) / (count - 1)
  );
}

function buildCoreSegments(graph: FlowGraph, placements: Map<string, Placement>): Segment[] {
  const segments: Segment[] = [];

  graph.edges.forEach((edge) => {
    const source = placements.get(edge.source);
    const target = placements.get(edge.target);
    if (source && target) {
      segments.push({ start: source.center, end: target.center });
    }
  });

  return segments;
}

function averageCenter(points: Point[]): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

/**
 * 大图沿用 ELK stress：核心节点交给 ELK，属性按连线找父节点后环形放置。
 */
async function applyChenStressLayout(graph: FlowGraph): Promise<FlowGraph> {
  const attributeNodes = graph.nodes.filter((node) => node.type === CHEN_ATTRIBUTE_TYPE);
  const coreNodeIds = new Set(
    graph.nodes
      .filter((node) => node.type === CHEN_ENTITY_TYPE || node.type === CHEN_RELATIONSHIP_TYPE)
      .map((node) => node.id)
  );
  const coreNodes = graph.nodes.filter((node) => coreNodeIds.has(node.id));
  const coreEdges = graph.edges.filter(
    (edge) => coreNodeIds.has(edge.source) && coreNodeIds.has(edge.target)
  );

  const { default: ELK } = await import('elkjs/lib/elk.bundled.js');
  const elk = new ELK();
  const layouted = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'stress',
      'elk.stress.desiredEdgeLength': '210',
      'elk.stress.iterationLimit': '300',
      'elk.spacing.nodeNode': '70',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]',
    },
    children: coreNodes.map((node) => ({
      id: node.id,
      width: node.width ?? DEFAULT_NODE_WIDTH,
      height: node.height ?? DEFAULT_NODE_HEIGHT,
    })),
    edges: coreEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });

  const childMap = new Map<string, ElkChild>(
    (layouted.children ?? []).map((child: ElkChild) => [child.id, child])
  );

  const layoutedCoreNodes = coreNodes.map((node) => {
    const layout = childMap.get(node.id);
    return {
      ...node,
      position: {
        x: Math.max(0, layout?.x ?? node.position.x),
        y: Math.max(0, layout?.y ?? node.position.y),
      },
      width: layout?.width ?? node.width ?? DEFAULT_NODE_WIDTH,
      height: layout?.height ?? node.height ?? DEFAULT_NODE_HEIGHT,
    };
  });

  const coreById = new Map(layoutedCoreNodes.map((node) => [node.id, node]));
  const attributeIds = new Set(attributeNodes.map((node) => node.id));
  const parentByAttribute = new Map<string, string>();

  graph.edges.forEach((edge) => {
    if (attributeIds.has(edge.target) && coreNodeIds.has(edge.source)) {
      parentByAttribute.set(edge.target, edge.source);
    }
  });

  const attributesByParent = new Map<string, ErNode[]>();
  const detachedAttributes: ErNode[] = [];

  attributeNodes.forEach((attribute) => {
    const parentId = parentByAttribute.get(attribute.id);
    if (!parentId || !coreById.has(parentId)) {
      detachedAttributes.push(attribute);
      return;
    }

    attributesByParent.set(parentId, [...(attributesByParent.get(parentId) ?? []), attribute]);
  });

  const occupied = layoutedCoreNodes.map(nodeBox);
  const coreSegments = coreEdges
    .map((edge) => {
      const source = coreById.get(edge.source);
      const target = coreById.get(edge.target);
      return source && target
        ? { start: nodeCenter(source), end: nodeCenter(target) }
        : null;
    })
    .filter((segment): segment is { start: Point; end: Point } => Boolean(segment));
  const placedAttributes: ErNode[] = [];

  [...attributesByParent.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([parentId, attributes]) => {
      const parent = coreById.get(parentId);
      if (!parent) {
        return;
      }

      const center = nodeCenter(parent);
      const sorted = [...attributes].sort((left, right) => left.id.localeCompare(right.id));
      const positions = placeAttributes(center, sorted.length);

      sorted.forEach((attribute, index) => {
        const width = attribute.width ?? ATTRIBUTE_WIDTH;
        const height = attribute.height ?? ATTRIBUTE_HEIGHT;
        const basePosition = positions[index] ?? attribute.position;
        const { position, box } = findFreeAttributeSlot(
          center,
          basePosition,
          width,
          height,
          occupied,
          coreSegments
        );

        placedAttributes.push({ ...attribute, position });
        occupied.push(box);
      });
    });

  return {
    nodes: [...layoutedCoreNodes, ...placedAttributes, ...detachedAttributes],
    edges: graph.edges,
  };
}

function nodeBox(node: ErNode): Box {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.width ?? DEFAULT_NODE_WIDTH,
    h: node.height ?? DEFAULT_NODE_HEIGHT,
  };
}

function nodeCenter(node: ErNode): Point {
  const box = nodeBox(node);
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function boxFromCenter(center: Point, width: number, height: number): Box {
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    w: width,
    h: height,
  };
}

/**
 * 围绕父节点找一个不与已有节点、也不与核心连线冲突的属性位置。
 * 先保持原角度，再左右交替旋转 30°，每一圈半径放大 20%，最多两倍半径；
 * 实在找不到再放宽连线约束，只保证节点不重叠。
 */
function findFreeAttributeSlot(
  center: Point,
  basePosition: Point,
  width: number,
  height: number,
  occupied: Box[],
  blockedSegments: Segment[]
): { position: Point; box: Box } {
  const baseCenter = {
    x: basePosition.x + width / 2,
    y: basePosition.y + height / 2,
  };
  const offsetX = baseCenter.x - center.x;
  const offsetY = baseCenter.y - center.y;
  const baseAngle = Math.atan2(offsetY, offsetX);
  const baseRadiusX = Math.max(Math.abs(offsetX), width / 2 + 12);
  const baseRadiusY = Math.max(Math.abs(offsetY), height / 2 + 12);

  for (const avoidEdges of [true, false]) {
    for (const scale of ATTRIBUTE_RADIUS_STEPS) {
      for (let slot = 0; slot < ATTRIBUTE_ANGLE_SLOTS; slot++) {
        const steps = Math.ceil(slot / 2) * ATTRIBUTE_ANGLE_STEP;
        const direction = slot % 2 === 1 ? 1 : -1;
        const angle = slot === 0 ? baseAngle : baseAngle + (direction * steps * Math.PI) / 180;
        const x = center.x + Math.cos(angle) * baseRadiusX * scale - width / 2;
        const y = center.y + Math.sin(angle) * baseRadiusY * scale - height / 2;
        const box = { x, y, w: width, h: height };

        if (collidesWithAny(box, occupied)) {
          continue;
        }

        if (avoidEdges && intersectsAnySegment(box, blockedSegments)) {
          continue;
        }

        return { position: { x, y }, box };
      }
    }
  }

  return {
    position: basePosition,
    box: { x: basePosition.x, y: basePosition.y, w: width, h: height },
  };
}

function intersectsAnySegment(box: Box, segments: Segment[]): boolean {
  if (segments.length === 0) {
    return false;
  }

  const rect = {
    left: box.x - ATTRIBUTE_EDGE_CLEARANCE,
    top: box.y - ATTRIBUTE_EDGE_CLEARANCE,
    right: box.x + box.w + ATTRIBUTE_EDGE_CLEARANCE,
    bottom: box.y + box.h + ATTRIBUTE_EDGE_CLEARANCE,
  };

  return segments.some((segment) => segmentIntersectsRect(segment.start, segment.end, rect));
}

function collidesWithAny(box: Box, occupied: Box[]): boolean {
  return occupied.some((other) => boxesOverlap(box, other));
}

function boxesOverlap(left: Box, right: Box): boolean {
  return !(
    left.x + left.w + ATTRIBUTE_CLEARANCE <= right.x ||
    right.x + right.w + ATTRIBUTE_CLEARANCE <= left.x ||
    left.y + left.h + ATTRIBUTE_CLEARANCE <= right.y ||
    right.y + right.h + ATTRIBUTE_CLEARANCE <= left.y
  );
}

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield items;
    return;
  }

  for (let index = 0; index < items.length; index++) {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const permutation of permutations(rest)) {
      yield [items[index], ...permutation];
    }
  }
}

const DEFAULT_NODE_WIDTH_OVERLAP = 220;
const DEFAULT_NODE_HEIGHT_OVERLAP = 120;

export function findNodeOverlaps(nodes: ErNode[]): Array<[string, string]> {
  const overlaps: Array<[string, string]> = [];

  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex++) {
      if (rectsOverlap(nodes[leftIndex], nodes[rightIndex])) {
        overlaps.push([nodes[leftIndex].id, nodes[rightIndex].id]);
      }
    }
  }

  return overlaps;
}

function rectsOverlap(left: ErNode, right: ErNode): boolean {
  const leftRect = nodeRect(left);
  const rightRect = nodeRect(right);

  return !(
    leftRect.right <= rightRect.left ||
    rightRect.right <= leftRect.left ||
    leftRect.bottom <= rightRect.top ||
    rightRect.bottom <= leftRect.top
  );
}

function nodeRect(node: ErNode) {
  const width = node.width ?? DEFAULT_NODE_WIDTH_OVERLAP;
  const height = node.height ?? DEFAULT_NODE_HEIGHT_OVERLAP;

  return {
    left: node.position.x - NODE_PADDING,
    top: node.position.y - NODE_PADDING,
    right: node.position.x + width + NODE_PADDING,
    bottom: node.position.y + height + NODE_PADDING,
  };
}
