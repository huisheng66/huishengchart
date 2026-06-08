import type { ErNode, FlowGraph } from './react-flow-types';

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 120;
const NODE_PADDING = 8;

type ElkChild = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export async function applyElkLayout(graph: FlowGraph): Promise<FlowGraph> {
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
      .filter((edge) => graph.nodes.some((node) => node.id === edge.source) && graph.nodes.some((node) => node.id === edge.target))
      .map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
  });

  const childMap = new Map<string, ElkChild>((layouted.children ?? []).map((child: ElkChild) => [child.id, child]));

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
  const width = node.width ?? DEFAULT_NODE_WIDTH;
  const height = node.height ?? DEFAULT_NODE_HEIGHT;

  return {
    left: node.position.x - NODE_PADDING,
    top: node.position.y - NODE_PADDING,
    right: node.position.x + width + NODE_PADDING,
    bottom: node.position.y + height + NODE_PADDING,
  };
}
