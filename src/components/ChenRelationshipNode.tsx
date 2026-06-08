import { Handle, Position } from '@xyflow/react';
import type { ChenRelationshipNodeData } from '../diagram/react-flow-types';

export function ChenRelationshipNode({ data }: { data: ChenRelationshipNodeData }) {
  return (
    <div className="chen-relationship">
      <Handle type="target" position={Position.Left} />
      <span>{data.relation.name}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
