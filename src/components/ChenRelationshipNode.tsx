import type { ChenRelationshipNodeData } from '../diagram/react-flow-types';
import { relationshipDisplayLabel } from '../domain/display-labels';
import { ChenHandles } from './ChenHandles';

export function ChenRelationshipNode({ data }: { data: ChenRelationshipNodeData }) {
  return (
    <div className="chen-relationship">
      <ChenHandles />
      <span>{relationshipDisplayLabel(data.relation)}</span>
    </div>
  );
}
