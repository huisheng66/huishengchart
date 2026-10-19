import { Handle, Position } from '@xyflow/react';
import type { ChenAttributeNodeData } from '../diagram/react-flow-types';
import { columnDisplayLabel } from '../domain/display-labels';

export function ChenAttributeNode({ data }: { data: ChenAttributeNodeData }) {
  const label = columnDisplayLabel(data.column);

  return (
    <div className={data.column.isPrimaryKey ? 'chen-attribute chen-attribute--key' : 'chen-attribute'}>
      <Handle id="anchor-source" type="source" position={Position.Right} className="chen-handle" />
      <Handle id="anchor-target" type="target" position={Position.Left} className="chen-handle" />
      <span className="chen-node-label">
        <span>{label.primary}</span>
        {label.secondary ? <span className="chen-node-label__sub">{label.secondary}</span> : null}
      </span>
    </div>
  );
}
