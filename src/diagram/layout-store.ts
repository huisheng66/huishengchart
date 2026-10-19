import type { DiagramLayout } from '../domain/er-model';
import type { ErEdge, ErNode } from './react-flow-types';

/**
 * 用用户手动调整过的位置覆盖计算出来的布局。
 * 只覆盖已保存的节点，新出现的节点保留布局引擎给出的位置。
 */
export function applySavedLayout(nodes: ErNode[], savedLayout?: DiagramLayout): ErNode[] {
  if (!savedLayout) {
    return nodes;
  }

  let changed = false;
  const positioned = nodes.map((node) => {
    const saved = savedLayout[node.id];
    if (!saved || (node.position.x === saved.x && node.position.y === saved.y)) {
      return node;
    }

    changed = true;
    return { ...node, position: { x: saved.x, y: saved.y } };
  });

  return changed ? positioned : nodes;
}

/** 保存布局时只需要位置，节点尺寸由适配器决定。 */
export function collectNodeLayout(nodes: ErNode[]): DiagramLayout {
  return nodes.reduce<DiagramLayout>((layout, node) => {
    layout[node.id] = { x: node.position.x, y: node.position.y };
    return layout;
  }, {});
}

/** 所有节点都有保存位置时，可以直接跳过自动布局。 */
export function hasFullSavedLayout(nodes: ErNode[], savedLayout?: DiagramLayout): boolean {
  if (!savedLayout || nodes.length === 0) {
    return false;
  }

  return nodes.every((node) => Boolean(savedLayout[node.id]));
}

/**
 * 只由节点和边的 id 组成的签名。
 * 拖动节点会改变位置但签名不变，因此不会触发重新布局。
 */
export function graphSignature(nodes: ErNode[], edges: ErEdge[]): string {
  const nodePart = nodes.map((node) => node.id).join('\u0001');
  const edgePart = edges.map((edge) => edge.id).join('\u0001');
  return `${nodePart}\u0002${edgePart}`;
}
