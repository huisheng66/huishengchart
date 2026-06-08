import { Handle, Position } from '@xyflow/react';
import type { ChenAttributeNodeData } from '../diagram/react-flow-types';

export function ChenAttributeNode({ data }: { data: ChenAttributeNodeData }) {
  return (
    <div className={data.column.isPrimaryKey ? 'chen-attribute chen-attribute--key' : 'chen-attribute'}>
      <Handle type="target" position={Position.Left} />
      <span>{data.column.name}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
