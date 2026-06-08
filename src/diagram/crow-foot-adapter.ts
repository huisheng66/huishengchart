import type { ErModel, RelationModel, TableModel } from '../domain/er-model';
import type { ErEdge, ErNode, FlowGraph } from './react-flow-types';

const TABLE_WIDTH = 260;
const TABLE_HEADER_HEIGHT = 42;
const TABLE_ROW_HEIGHT = 28;
const TABLE_VERTICAL_GAP = 170;

export function toCrowFootFlow(model: ErModel): FlowGraph {
  return {
    nodes: model.tables.map(toTableNode),
    edges: [...model.relations, ...model.inferredRelations].map(toRelationshipEdge),
  };
}

function toTableNode(table: TableModel, index: number): ErNode {
  return {
    id: table.id,
    type: 'table',
    position: { x: 0, y: index * TABLE_VERTICAL_GAP },
    width: TABLE_WIDTH,
    height: TABLE_HEADER_HEIGHT + table.columns.length * TABLE_ROW_HEIGHT,
    data: { table },
  };
}

function toRelationshipEdge(relation: RelationModel): ErEdge {
  return {
    id: relation.id,
    type: 'relationship',
    source: relation.sourceTableId,
    target: relation.targetTableId,
    data: {
      relation,
      label: edgeLabel(relation),
      inferred: relation.source !== 'foreign-key',
    },
  };
}

function edgeLabel(relation: RelationModel): string {
  switch (relation.cardinality) {
    case 'one-to-one':
      return '1:1';
    case 'one-to-many':
      return '1:N';
    case 'many-to-many':
      return 'N:N';
    case 'many-to-one':
    default:
      return 'N:1';
  }
}
