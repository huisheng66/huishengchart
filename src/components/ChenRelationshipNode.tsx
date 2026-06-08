import { Handle, Position } from '@xyflow/react';
import type { ChenRelationshipNodeData } from '../diagram/react-flow-types';
import { relationshipDisplayLabel } from '../domain/display-labels';

export function ChenRelationshipNode({ data }: { data: ChenRelationshipNodeData }) {
  return (
    <div className="chen-relationship">
      <Handle type="target" position={Position.Left} />
      <span>{relationshipDisplayLabel(data.relation)}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
