import type { ErModel, RelationModel, TableModel } from '../domain/er-model';
import { oneOrManyLabel } from '../domain/display-labels';
import type { ErEdge, ErNode, FlowGraph } from './react-flow-types';

const ENTITY_WIDTH = 170;
const ENTITY_HEIGHT = 64;
const ATTRIBUTE_WIDTH = 150;
const ATTRIBUTE_HEIGHT = 58;
const RELATIONSHIP_SIZE = 112;

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
          x: 270,
          y: tableIndex * 240 + columnIndex * 68,
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
      position: { x: 560, y: index * 190 },
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
    position: { x: 0, y: index * 240 },
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
  return oneOrManyLabel(!(relation.cardinality === 'one-to-one' || relation.cardinality === 'one-to-many'));
}

function targetCardinalityLabel(relation: RelationModel): string {
  return oneOrManyLabel(!(relation.cardinality === 'one-to-one' || relation.cardinality === 'many-to-one'));
}
