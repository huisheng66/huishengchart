import { Handle, Position } from '@xyflow/react';
import type { ChenEntityNodeData } from '../diagram/react-flow-types';

export function ChenEntityNode({ data }: { data: ChenEntityNodeData }) {
  return (
    <div className="chen-entity">
      <Handle type="target" position={Position.Left} />
      <span>{data.table.name}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
