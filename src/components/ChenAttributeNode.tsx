import type { ChenAttributeNodeData } from '../diagram/react-flow-types';
import { columnDisplayLabel } from '../domain/display-labels';
import { ChenHandles } from './ChenHandles';

export function ChenAttributeNode({ data }: { data: ChenAttributeNodeData }) {
  const label = columnDisplayLabel(data.column);

  return (
    <div className={data.column.isPrimaryKey ? 'chen-attribute chen-attribute--key' : 'chen-attribute'}>
      <ChenHandles />
      <span className="chen-node-label">
        <span>{label.primary}</span>
        {label.secondary ? <span className="chen-node-label__sub">{label.secondary}</span> : null}
      </span>
    </div>
  );
}
