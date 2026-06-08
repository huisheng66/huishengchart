import type { ChenEntityNodeData } from '../diagram/react-flow-types';
import { tableDisplayLabel } from '../domain/display-labels';
import { ChenHandles } from './ChenHandles';

export function ChenEntityNode({ data }: { data: ChenEntityNodeData }) {
  const label = tableDisplayLabel(data.table);

  return (
    <div className="chen-entity">
      <ChenHandles />
      <span className="chen-node-label">
        <span>{label.primary}</span>
        {label.secondary ? <span className="chen-node-label__sub">{label.secondary}</span> : null}
      </span>
    </div>
  );
}
