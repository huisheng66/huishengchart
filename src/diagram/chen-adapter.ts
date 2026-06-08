import type { ErModel, RelationModel, TableModel } from '../domain/er-model';
import type { ErEdge, ErNode, FlowGraph } from './react-flow-types';

const ENTITY_WIDTH = 150;
const ENTITY_HEIGHT = 56;
const ATTRIBUTE_WIDTH = 132;
const ATTRIBUTE_HEIGHT = 46;
const RELATIONSHIP_SIZE = 104;

export function toChenFlow(model: ErModel): FlowGraph {
  const nodes: ErNode[] = [];
  const edges: ErEdge[] = [];

  model.tables.forEach((table, tableIndex) => {
    nodes.push(toEntityNode(table, tableIndex));

    table.columns.forEach((column, columnIndex) => {
      const attributeId = attributeNodeId(table.id, column.id);
      nodes.push({
        id: attributeId,
        type: 'chenAttribute',
        position: {
          x: 250,
          y: tableIndex * 220 + columnIndex * 58,
        },
        width: ATTRIBUTE_WIDTH,
        height: ATTRIBUTE_HEIGHT,
        data: { table, column },
      });
      edges.push({
        id: `edge:${entityNodeId(table.id)}:${attributeId}`,
        type: 'relationship',
        source: entityNodeId(table.id),
        target: attributeId,
        data: { label: '', inferred: false },
      });
    });
  });

  [...model.relations, ...model.inferredRelations].forEach((relation, index) => {
    const relationshipId = relationshipNodeId(relation.id);
    nodes.push({
      id: relationshipId,
      type: 'chenRelationship',
      position: { x: 520, y: index * 180 },
      width: RELATIONSHIP_SIZE,
      height: RELATIONSHIP_SIZE,
      data: { relation },
    });

    edges.push({
      id: `edge:${entityNodeId(relation.sourceTableId)}:${relationshipId}`,
      type: 'relationship',
      source: entityNodeId(relation.sourceTableId),
      target: relationshipId,
      data: {
        relation,
        label: sourceCardinalityLabel(relation),
        inferred: relation.source !== 'foreign-key',
      },
    });
    edges.push({
      id: `edge:${relationshipId}:${entityNodeId(relation.targetTableId)}`,
      type: 'relationship',
      source: relationshipId,
      target: entityNodeId(relation.targetTableId),
      data: {
        relation,
        label: targetCardinalityLabel(relation),
        inferred: relation.source !== 'foreign-key',
      },
    });
  });

  return { nodes, edges };
}

function toEntityNode(table: TableModel, index: number): ErNode {
  return {
    id: entityNodeId(table.id),
    type: 'chenEntity',
    position: { x: 0, y: index * 220 },
    width: ENTITY_WIDTH,
    height: ENTITY_HEIGHT,
    data: { table },
  };
}

function entityNodeId(tableId: string): string {
  return `entity:${tableId}`;
}

function attributeNodeId(tableId: string, columnId: string): string {
  return `attribute:${tableId}:${columnId}`;
}

function relationshipNodeId(relationId: string): string {
  return `relationship:${relationId}`;
}

function sourceCardinalityLabel(relation: RelationModel): string {
  if (relation.cardinality === 'one-to-one' || relation.cardinality === 'one-to-many') {
    return '1';
  }
  return 'N';
}

function targetCardinalityLabel(relation: RelationModel): string {
  if (relation.cardinality === 'one-to-one' || relation.cardinality === 'many-to-one') {
    return '1';
  }
  return 'N';
}
