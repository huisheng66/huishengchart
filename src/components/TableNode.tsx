import { Handle, Position } from '@xyflow/react';
import type { TableNodeData } from '../diagram/react-flow-types';

export function TableNode({ data }: { data: TableNodeData }) {
  return (
    <div className="table-node">
      <div className="table-node__header">{data.table.name}</div>
      <div className="table-node__body">
        {data.table.columns.map((column) => (
          <div className="table-node__row" key={column.id}>
            <Handle
              id={`target:${column.id}`}
              type="target"
              position={Position.Left}
              className="table-node__handle table-node__handle--target"
            />
            <span className="table-node__column">{column.name}</span>
            <span className="table-node__meta">
              {[column.isPrimaryKey ? 'PK' : '', column.isForeignKey ? 'FK' : '', column.isUnique ? 'UK' : '']
                .filter(Boolean)
                .join('/')}
            </span>
            <Handle
              id={`source:${column.id}`}
              type="source"
              position={Position.Right}
              className="table-node__handle table-node__handle--source"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
