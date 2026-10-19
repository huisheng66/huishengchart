import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react';
import { anchorOnChenNode, type ChenNodeShape } from '../diagram/chen-anchors';
import type { RelationshipEdgeData } from '../diagram/react-flow-types';

type AnchorNode = {
  type?: string;
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
  internals: { positionAbsolute: { x: number; y: number } };
};

export function RelationshipEdge(props: EdgeProps) {
  const data = props.data as RelationshipEdgeData | undefined;

  if (data?.edgeStyle === 'straight') {
    return <ChenStraightEdge {...props} />;
  }

  return <SmoothRelationshipEdge {...props} />;
}

/**
 * 陈氏图连线：两端先按节点位置算边界交点，再画直线。
 * 关系菱形仍用四角句柄，实体/属性落在朝向对方的边界点上。
 */
function ChenStraightEdge(props: EdgeProps) {
  const data = props.data as RelationshipEdgeData | undefined;
  const sourceNode = useInternalNode(props.source) as AnchorNode | undefined;
  const targetNode = useInternalNode(props.target) as AnchorNode | undefined;
  const relation = data?.relation;
  const sourceIsEntity = props.source.startsWith('entity:');
  const targetIsEntity = props.target.startsWith('entity:');
  const entityNodeId = sourceIsEntity ? props.source : targetIsEntity ? props.target : '';
  const entityTableId = entityNodeId.slice('entity:'.length);
  const otherEntityNodeId =
    relation &&
    entityTableId &&
    (relation.sourceTableId === entityTableId || relation.targetTableId === entityTableId)
      ? `entity:${
          relation.sourceTableId === entityTableId
            ? relation.targetTableId
            : relation.sourceTableId
        }`
      : '';
  const otherEntityNode = useInternalNode(otherEntityNodeId) as AnchorNode | undefined;

  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourceCenter = nodeCenter(sourceNode);
  const targetCenter = nodeCenter(targetNode);
  // 同一对实体的两条边用同一个主轴，保证菱形连的是对角顶点。
  const pairAxis =
    otherEntityNode && entityNodeId
      ? axisBetween(nodeCenter(sourceIsEntity ? sourceNode : targetNode), nodeCenter(otherEntityNode))
      : undefined;

  // 所有端点都按当前节点位置实时计算：
  // 实体取矩形边界、属性取椭圆边界、关系菱形取朝向对方的顶点。
  const source = anchorFor(
    sourceNode,
    targetCenter,
    sourceNode.type === 'chenRelationship' ? pairAxis : undefined
  );
  const target = anchorFor(
    targetNode,
    sourceCenter,
    targetNode.type === 'chenRelationship' ? pairAxis : undefined
  );

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
  });
  const inferred = Boolean(data?.inferred);

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  const offsetX = (-dy / length) * 16;
  const offsetY = (dx / length) * 16;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: '#111827',
          strokeDasharray: inferred ? '6 6' : undefined,
          strokeWidth: 1.8,
        }}
      />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className="edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX + offsetX}px, ${labelY + offsetY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function SmoothRelationshipEdge(props: EdgeProps) {
  const data = props.data as RelationshipEdgeData | undefined;
  const [edgePath, labelX, labelY] = getSmoothStepPath(props);
  const inferred = Boolean(data?.inferred);

  const dx = props.targetX - props.sourceX;
  const dy = props.targetY - props.sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const offsetX = (-dy / len) * 16;
  const offsetY = (dx / len) * 16;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: '#111827',
          strokeDasharray: inferred ? '6 6' : undefined,
          strokeWidth: 1.8,
        }}
      />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className="edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX + offsetX}px, ${labelY + offsetY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function anchorFor(
  node: AnchorNode,
  toward: { x: number; y: number },
  axis?: 'horizontal' | 'vertical'
) {
  const position = node.internals.positionAbsolute;
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;
  const center = {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };

  return anchorOnChenNode(nodeShape(node.type), center, width, height, toward, axis);
}

function axisBetween(
  left: { x: number; y: number },
  right: { x: number; y: number }
): 'horizontal' | 'vertical' {
  return Math.abs(left.x - right.x) >= Math.abs(left.y - right.y) ? 'horizontal' : 'vertical';
}

function nodeShape(type: string | undefined): ChenNodeShape {
  if (type === 'chenAttribute') {
    return 'attribute';
  }

  if (type === 'chenRelationship') {
    return 'relationship';
  }

  return 'entity';
}

function nodeCenter(node: AnchorNode) {
  const position = node.internals.positionAbsolute;
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;

  return {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };
}
