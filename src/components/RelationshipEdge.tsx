import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath, getStraightPath } from '@xyflow/react';
import type { RelationshipEdgeData } from '../diagram/react-flow-types';

export function RelationshipEdge(props: EdgeProps) {
  const data = props.data as RelationshipEdgeData | undefined;
  const [edgePath, labelX, labelY] = data?.edgeStyle === 'straight' ? getStraightPath(props) : getSmoothStepPath(props);
  const inferred = Boolean(data?.inferred);

  // Compute perpendicular offset (16px from the line)
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
