import { Handle, Position } from '@xyflow/react';
import type { TableNodeData } from '../diagram/react-flow-types';
import { columnDisplayLabel, tableDisplayLabel } from '../domain/display-labels';

export function TableNode({ data }: { data: TableNodeData }) {
  const tableLabel = tableDisplayLabel(data.table);

  return (
    <div className="table-node">
      <div className="table-node__header">
        <span className="table-node__title">{tableLabel.primary}</span>
        {tableLabel.secondary ? <span className="table-node__subtitle">{tableLabel.secondary}</span> : null}
      </div>
      <div className="table-node__body">
        {data.table.columns.map((column) => {
          const columnLabel = columnDisplayLabel(column);
          const meta = [column.isPrimaryKey ? '主键' : '', column.isForeignKey ? '外键' : '', column.isUnique ? '唯一' : '']
            .filter(Boolean)
            .join('/');

          return (
            <div className="table-node__row" key={column.id}>
              <Handle
                id={`target:${column.id}`}
                type="target"
                position={Position.Left}
                className="table-node__handle table-node__handle--target"
              />
              <span className="table-node__column">
                <span className="table-node__column-main">{columnLabel.primary}</span>
                {columnLabel.secondary ? <span className="table-node__column-sub">{columnLabel.secondary}</span> : null}
              </span>
              <span className="table-node__meta">{meta}</span>
              <Handle
                id={`source:${column.id}`}
                type="source"
                position={Position.Right}
                className="table-node__handle table-node__handle--source"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
