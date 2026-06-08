import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from '@xyflow/react';
import type { RelationshipEdgeData } from '../diagram/react-flow-types';

export function RelationshipEdge(props: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath(props);
  const data = props.data as RelationshipEdgeData | undefined;
  const inferred = Boolean(data?.inferred);

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: inferred ? '#b45309' : '#475569',
          strokeDasharray: inferred ? '6 6' : undefined,
          strokeWidth: 2,
        }}
      />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div className="edge-label" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}>
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
