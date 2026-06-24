import type { ErNode, FlowGraph } from './react-flow-types';

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 120;
const NODE_PADDING = 8;

const CHEN_ATTRIBUTE_TYPE = 'chenAttribute';
const CHEN_ENTITY_TYPE = 'chenEntity';
const CHEN_RELATIONSHIP_TYPE = 'chenRelationship';

type ElkChild = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export async function applyElkLayout(graph: FlowGraph): Promise<FlowGraph> {
  const hasChenAttributes = graph.nodes.some((node) => node.type === CHEN_ATTRIBUTE_TYPE);

  if (hasChenAttributes) {
    return applyChenElkLayout(graph);
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

async function applyChenElkLayout(graph: FlowGraph): Promise<FlowGraph> {
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js');

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

  const entityNodeMap = new Map(
    layoutedCoreNodes
      .filter((node) => node.type === CHEN_ENTITY_TYPE)
      .map((node) => [node.id, node])
  );

  const layoutedAttributeNodes = attributeNodes.map((node) => {
    const match = node.id.match(/^attribute:([^:]+):/);
    if (!match) {
      return node;
    }

    const entityId = `entity:${match[1]}`;
    const entityNode = entityNodeMap.get(entityId);
    if (!entityNode) {
      return node;
    }

    const entityCenter = {
      x: entityNode.position.x + (entityNode.width ?? DEFAULT_NODE_WIDTH) / 2,
      y: entityNode.position.y + (entityNode.height ?? DEFAULT_NODE_HEIGHT) / 2,
    };
    const positions = placeAttributesAround(
      entityCenter,
      1,
      entityNode.width ?? DEFAULT_NODE_WIDTH,
      entityNode.height ?? DEFAULT_NODE_HEIGHT
    );

    return {
      ...node,
      position: positions[0],
    };
  });

  const layoutedAttributeByEntity = groupAttributesByEntity(layoutedAttributeNodes);
  const reAttributed: ErNode[] = [];

  layoutedAttributeByEntity.forEach((attributes, entityId) => {
    const entityNode = entityNodeMap.get(entityId);
    if (!entityNode) {
      attributes.forEach((attr) => reAttributed.push(attr));
      return;
    }

    const entityCenter = {
      x: entityNode.position.x + (entityNode.width ?? DEFAULT_NODE_WIDTH) / 2,
      y: entityNode.position.y + (entityNode.height ?? DEFAULT_NODE_HEIGHT) / 2,
    };
    const positions = placeAttributesAround(
      entityCenter,
      attributes.length,
      ENTITY_ATTRIBUTE_WIDTH,
      ENTITY_ATTRIBUTE_HEIGHT
    );

    attributes.forEach((attr, index) => {
      reAttributed.push({
        ...attr,
        position: positions[index] ?? attr.position,
      });
    });
  });

  return {
    nodes: [...layoutedCoreNodes, ...reAttributed],
    edges: graph.edges,
  };
}

function groupAttributesByEntity(
  attributes: ErNode[]
): Map<string, ErNode[]> {
  const groups = new Map<string, ErNode[]>();

  attributes.forEach((node) => {
    const match = node.id.match(/^attribute:([^:]+):/);
    if (match) {
      const entityId = `entity:${match[1]}`;
      if (!groups.has(entityId)) {
        groups.set(entityId, []);
      }
      groups.get(entityId)!.push(node);
    }
  });

  return groups;
}

const ENTITY_ATTRIBUTE_WIDTH = 134;
const ENTITY_ATTRIBUTE_HEIGHT = 46;

function placeAttributesAround(
  center: { x: number; y: number },
  count: number,
  entityWidth: number,
  entityHeight: number
): Array<{ x: number; y: number }> {
  if (count === 0) {
    return [];
  }

  const radiusX = entityWidth * 0.85 + 20;
  const radiusY = entityHeight * 0.85 + 20;
  const stepX = 12;
  const stepY = 10;

  const angles = attributeAngles(count);
  let positions: Array<{ x: number; y: number }> = [];

  for (let attempt = 0; attempt < 6; attempt++) {
    const rx = radiusX + attempt * stepX;
    const ry = radiusY + attempt * stepY;

    positions = angles.map((angle) => ({
      x: center.x + Math.cos(angle) * rx - ENTITY_ATTRIBUTE_WIDTH / 2,
      y: center.y + Math.sin(angle) * ry - ENTITY_ATTRIBUTE_HEIGHT / 2,
    }));

    const boxes = [
      {
        x: center.x - entityWidth / 2,
        y: center.y - entityHeight / 2,
        w: entityWidth,
        h: entityHeight,
      },
      ...positions.map((p) => ({
        x: p.x,
        y: p.y,
        w: ENTITY_ATTRIBUTE_WIDTH,
        h: ENTITY_ATTRIBUTE_HEIGHT,
      })),
    ];

    if (!hasOverlap(boxes)) {
      return positions;
    }
  }

  return positions;
}

function attributeAngles(count: number): number[] {
  if (count === 0) {
    return [];
  }

  if (count === 1) {
    return [(-90 * Math.PI) / 180];
  }

  if (count === 2) {
    return [(-140 * Math.PI) / 180, (-30 * Math.PI) / 180];
  }

  return Array.from(
    { length: count },
    (_, index) => ((-90 + (360 * index) / count) * Math.PI) / 180
  );
}

type Box = { x: number; y: number; w: number; h: number };

function hasOverlap(boxes: Box[]): boolean {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (
        boxes[i].x < boxes[j].x + boxes[j].w &&
        boxes[i].x + boxes[i].w > boxes[j].x &&
        boxes[i].y < boxes[j].y + boxes[j].h &&
        boxes[i].y + boxes[i].h > boxes[j].y
      ) {
        return true;
      }
    }
  }

  return false;
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
