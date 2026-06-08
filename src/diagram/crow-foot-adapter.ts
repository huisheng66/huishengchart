import type { ErModel, RelationModel, TableModel } from '../domain/er-model';
import { cardinalityEdgeLabel } from '../domain/display-labels';
import type { ErEdge, ErNode, FlowGraph } from './react-flow-types';

const TABLE_WIDTH = 260;
const TABLE_HEADER_HEIGHT = 56;
const TABLE_ROW_HEIGHT = 42;
const TABLE_VERTICAL_GAP = 230;

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
    sourceHandle: columnHandleId('source', relation.sourceColumnIds),
    target: relation.targetTableId,
    targetHandle: columnHandleId('target', relation.targetColumnIds),
    data: {
      relation,
      label: cardinalityEdgeLabel(relation.cardinality),
      inferred: relation.source !== 'foreign-key',
    },
  };
}

function columnHandleId(side: 'source' | 'target', columnIds: string[]): string {
  return `${side}:${columnIds.join('|')}`;
}
