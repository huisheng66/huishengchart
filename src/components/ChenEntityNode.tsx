import { Handle, Position } from '@xyflow/react';
import type { ChenEntityNodeData } from '../diagram/react-flow-types';
import { tableDisplayLabel } from '../domain/display-labels';

export function ChenEntityNode({ data }: { data: ChenEntityNodeData }) {
  const label = tableDisplayLabel(data.table);

  return (
    <div className="chen-entity">
      <Handle type="target" position={Position.Left} />
      <span className="chen-node-label">
        <span>{label.primary}</span>
        {label.secondary ? <span className="chen-node-label__sub">{label.secondary}</span> : null}
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
