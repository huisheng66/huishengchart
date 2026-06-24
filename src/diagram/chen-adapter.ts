import type { ColumnModel, ErModel, RelationModel, TableModel } from '../domain/er-model';
import { oneOrManyLabel } from '../domain/display-labels';
import type { ErNode, FlowGraph } from './react-flow-types';
import type { ConceptualStyle, NodePlacement } from './chen-types';
import {
  ATTRIBUTE_HEIGHT,
  ATTRIBUTE_WIDTH,
  CLUSTER_HEIGHT,
  CLUSTER_WIDTH,
  ENTITY_HEIGHT,
  ENTITY_WIDTH,
  RELATIONSHIP_SIZE,
  attributeNodeId,
  centerToPosition,
  countRelationsByPair,
  createStraightEdge,
  entityNodeId,
  placeAssociativeRelationship,
  placeAttributes,
  placeRelationship,
  relationshipNodeId,
} from './chen-geometry';
import { detectConceptualStyle } from './chen-ticketing';

export {
  type ConceptualStyle,
  type Point,
  type HandleSide,
  type Rect,
  type NodePlacement,
  type ChenEdgeData,
  type AssociativeRelationship,
} from './chen-types';

export {
  entityNodeId,
  attributeNodeId,
  relationshipNodeId,
  RELATIONSHIP_SIZE,
} from './chen-geometry';

const MAX_ENTITY_ATTRIBUTES = 6;
const MAX_DENSE_ENTITY_ATTRIBUTES = 2;
const MAX_RELATIONSHIP_ATTRIBUTES = 4;
const DENSE_CARDINALITY_LABEL_THRESHOLD = 12;
const DENSE_ENTITY_THRESHOLD = 6;

const TECHNICAL_COLUMN_NAMES = new Set([
  'created_at',
  'updated_at',
  'deleted_at',
  'created_by',
  'updated_by',
  'deleted_by',
  'create_time',
  'update_time',
  'delete_time',
  'gmt_create',
  'gmt_modified',
  'version',
  'revision',
  'row_version',
  'lock_version',
]);

const CJK_TEXT = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/u;
const DESCRIPTOR_COLUMN_PATTERN = /(^name$|_name$|^title$|_title$|^label$|_label$|^code$|_code$|^no$|_no$|number$|_number$)/i;
const IMPORTANT_COLUMN_PATTERN = /(status|state|type|amount|price|total|quantity|count|date|time|score|grade|level)/i;

export function toChenFlow(model: ErModel): FlowGraph {
  const nodes: ErNode[] = [];
  const edges: ErEdge[] = [];
  const placements = new Map<string, NodePlacement>();
  const relationList = [...model.relations, ...model.inferredRelations];
  const conceptualStyle = detectConceptualStyle(model);
  const associativeRelationships = identifyAssociativeRelationships(model.tables, relationList);
  const associativeTableIds = new Set([...associativeRelationships.keys()]);
  const entityTables = model.tables.filter((table) => !associativeTableIds.has(table.id));
  const normalRelations = relationList.filter(
    (relation) =>
      !associativeTableIds.has(relation.sourceTableId) &&
      !associativeTableIds.has(relation.targetTableId)
  );
  const tableById = new Map(model.tables.map((table) => [table.id, table]));
  const visibleRelations = selectVisibleRelations(normalRelations, conceptualStyle);
  const conceptualRelations = [
    ...visibleRelations.map((relation) => toConceptualRelation(relation, tableById, conceptualStyle)),
    ...(conceptualStyle?.extraRelations ?? []),
  ];
  const denseDiagram =
    entityTables.length > DENSE_ENTITY_THRESHOLD ||
    normalRelations.length + associativeRelationships.size > DENSE_CARDINALITY_LABEL_THRESHOLD;
  const showCardinalityLabels = conceptualStyle?.showCardinalityLabels ?? !denseDiagram;
  const entityColumns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(entityTables.length))));

  entityTables.forEach((table, tableIndex) => {
    addNode(toEntityNode(table, tableIndex, entityColumns, conceptualStyle), nodes, placements);
  });

  entityTables.forEach((table) => {
    const entityId = entityNodeId(table.id);
    const entityPlacement = placements.get(entityId);

    if (!entityPlacement) {
      return;
    }

    const displayTable = displayTableFor(table, conceptualStyle);
    const conceptualColumns = selectEntityAttributes(table, denseDiagram, conceptualStyle);
    const fallbackAttributePositions = placeAttributes(
      entityPlacement.center,
      conceptualColumns.length,
      conceptualStyle?.attributeAngles[table.id]
    );
    const attributePositions = conceptualColumns.map((column, columnIndex) => {
      const configuredCenter = conceptualStyle?.attributePositions[table.id]?.[column.id];
      return configuredCenter
        ? centerToPosition(configuredCenter, ATTRIBUTE_WIDTH, ATTRIBUTE_HEIGHT)
        : fallbackAttributePositions[columnIndex];
    });

    conceptualColumns.forEach((column, columnIndex) => {
      const attributeId = attributeNodeId(table.id, column.id);
      addNode(
        {
          id: attributeId,
          type: 'chenAttribute',
          position: attributePositions[columnIndex],
          width: ATTRIBUTE_WIDTH,
          height: ATTRIBUTE_HEIGHT,
          data: {
            table: displayTable,
            column: displayColumnFor(table, column, conceptualStyle),
          },
        },
        nodes,
        placements
      );
      edges.push(
        createStraightEdge(
          `edge:${entityId}:${attributeId}`,
          entityId,
          attributeId,
          { label: '', inferred: false },
          placements
        )
      );
    });
  });

  const relationCounts = countRelationsByPair(conceptualRelations);
  const usedRelationIndexes = new Map<string, number>();

  conceptualRelations.forEach((relation) => {
    const relationshipId = relationshipNodeId(relation.id);
    const relationshipCenter =
      conceptualStyle?.relationPositions[relation.id] ??
      placeRelationship(relation, relationCounts, usedRelationIndexes, placements);
    addNode(
      {
        id: relationshipId,
        type: 'chenRelationship',
        position: centerToPosition(relationshipCenter, RELATIONSHIP_SIZE, RELATIONSHIP_SIZE),
        width: RELATIONSHIP_SIZE,
        height: RELATIONSHIP_SIZE,
        data: { relation },
      },
      nodes,
      placements
    );
  });

  conceptualRelations.forEach((relation) => {
    const relationshipId = relationshipNodeId(relation.id);
    edges.push({
      ...createStraightEdge(
        `edge:${entityNodeId(relation.sourceTableId)}:${relationshipId}`,
        entityNodeId(relation.sourceTableId),
        relationshipId,
        {
          relation,
          label: cardinalityLabelFor(relation, 'source', showCardinalityLabels, conceptualStyle),
          inferred: relation.source !== 'foreign-key',
        },
        placements
      ),
    });
    edges.push({
      ...createStraightEdge(
        `edge:${relationshipId}:${entityNodeId(relation.targetTableId)}`,
        relationshipId,
        entityNodeId(relation.targetTableId),
        {
          relation,
          label: cardinalityLabelFor(relation, 'target', showCardinalityLabels, conceptualStyle),
          inferred: relation.source !== 'foreign-key',
        },
        placements
      ),
    });
  });

  associativeRelationships.forEach((associativeRelationship) => {
    const relationshipId = relationshipNodeId(associativeRelationship.relationship.id);
    const relationshipCenter = placeAssociativeRelationship(
      associativeRelationship.relations,
      placements
    );
    addNode(
      {
        id: relationshipId,
        type: 'chenRelationship',
        position: centerToPosition(relationshipCenter, RELATIONSHIP_SIZE, RELATIONSHIP_SIZE),
        width: RELATIONSHIP_SIZE,
        height: RELATIONSHIP_SIZE,
        data: { relation: associativeRelationship.relationship },
      },
      nodes,
      placements
    );

    associativeRelationship.relations.forEach((relation) => {
      const entityId = entityNodeId(relation.targetTableId);
      if (!placements.has(entityId)) {
        return;
      }

      edges.push(
        createStraightEdge(
          `edge:${entityId}:${relationshipId}`,
          entityId,
          relationshipId,
          {
            relation: associativeRelationship.relationship,
            label: cardinalityLabelFor(
              associativeRelationship.relationship,
              'source',
              showCardinalityLabels,
              conceptualStyle
            ),
            inferred: relation.source !== 'foreign-key',
          },
          placements
        )
      );
    });

    const attributePositions = placeAttributes(
      relationshipCenter,
      associativeRelationship.attributeColumns.length
    );
    associativeRelationship.attributeColumns.forEach((column, columnIndex) => {
      const attributeId = attributeNodeId(associativeRelationship.table.id, column.id);
      addNode(
        {
          id: attributeId,
          type: 'chenAttribute',
          position: attributePositions[columnIndex],
          width: ATTRIBUTE_WIDTH,
          height: ATTRIBUTE_HEIGHT,
          data: {
            table: displayTableFor(associativeRelationship.table, conceptualStyle),
            column: displayColumnFor(associativeRelationship.table, column, conceptualStyle),
          },
        },
        nodes,
        placements
      );
      edges.push(
        createStraightEdge(
          `edge:${relationshipId}:${attributeId}`,
          relationshipId,
          attributeId,
          { label: '', inferred: false },
          placements
        )
      );
    });
  });

  return {
    nodes,
    edges,
    layoutStrategy: 'manual',
  };
}

function identifyAssociativeRelationships(
  tables: TableModel[],
  relations: RelationModel[]
): Map<string, AssociativeRelationship> {
  const associativeRelationships = new Map<string, AssociativeRelationship>();

  tables.forEach((table) => {
    const outgoingRelations = relations.filter((relation) => relation.sourceTableId === table.id);
    const foreignKeyColumnIds = new Set(
      outgoingRelations.flatMap((relation) => relation.sourceColumnIds)
    );
    const targetTableIds = new Set(outgoingRelations.map((relation) => relation.targetTableId));
    const primaryKeyIsForeignKeys =
      table.primaryKey.length >= 2 &&
      table.primaryKey.every((columnId) => foreignKeyColumnIds.has(columnId));

    if (outgoingRelations.length < 2 || targetTableIds.size < 2 || !primaryKeyIsForeignKeys) {
      return;
    }

    const relationshipId = `associative:${table.id}`;
    associativeRelationships.set(table.id, {
      table,
      relations: outgoingRelations,
      relationship: {
        id: relationshipId,
        name: tableConceptName(table) || table.displayName || table.name,
        sourceTableId: outgoingRelations[0].targetTableId,
        sourceColumnIds: [],
        targetTableId: outgoingRelations[1].targetTableId,
        targetColumnIds: [],
        cardinality: 'many-to-many',
        source: outgoingRelations.some((relation) => relation.source !== 'foreign-key')
          ? 'rule-inferred'
          : 'foreign-key',
        reason: 'associative-table',
      },
      attributeColumns: selectRelationshipAttributes(table, foreignKeyColumnIds),
    });
  });

  return associativeRelationships;
}

function selectEntityAttributes(
  table: TableModel,
  denseDiagram: boolean,
  conceptualStyle: ConceptualStyle | null
): ColumnModel[] {
  const conceptualColumnNames = conceptualStyle?.columnLabels[table.id];
  if (conceptualColumnNames) {
    return table.columns.filter((column) => Boolean(conceptualColumnNames[column.id]));
  }

  const candidates = table.columns.filter(
    (column) => !column.isForeignKey && !isTechnicalColumn(column)
  );
  const conceptualCandidates = denseDiagram
    ? candidates.filter((column) => !column.isPrimaryKey)
    : candidates;
  return rankColumns(conceptualCandidates.length > 0 ? conceptualCandidates : candidates).slice(
    0,
    denseDiagram ? MAX_DENSE_ENTITY_ATTRIBUTES : MAX_ENTITY_ATTRIBUTES
  );
}

function selectRelationshipAttributes(
  table: TableModel,
  foreignKeyColumnIds: Set<string>
): ColumnModel[] {
  const candidates = table.columns.filter(
    (column) => !foreignKeyColumnIds.has(column.id) && !isTechnicalColumn(column)
  );
  return rankColumns(candidates).slice(0, MAX_RELATIONSHIP_ATTRIBUTES);
}

function selectVisibleRelations(
  relations: RelationModel[],
  conceptualStyle: ConceptualStyle | null
): RelationModel[] {
  if (!conceptualStyle) {
    return relations;
  }

  const relationIds = new Set(Object.keys(conceptualStyle.relationNames));
  return relations.filter((relation) => relationIds.has(relation.id));
}

function displayTableFor(
  table: TableModel,
  conceptualStyle: ConceptualStyle | null
): TableModel {
  const label = conceptualStyle?.tableLabels[table.id];
  if (!label) {
    return table;
  }

  return {
    ...table,
    name: label,
    displayName: label,
    comment: undefined,
  };
}

function displayColumnFor(
  table: TableModel,
  column: ColumnModel,
  conceptualStyle: ConceptualStyle | null
): ColumnModel {
  const label = conceptualStyle?.columnLabels[table.id]?.[column.id];
  if (!label) {
    return column;
  }

  return {
    ...column,
    name: label,
    comment: undefined,
  };
}

function cardinalityLabelFor(
  relation: RelationModel,
  side: 'source' | 'target',
  showCardinalityLabels: boolean,
  conceptualStyle: ConceptualStyle | null
): string {
  if (!showCardinalityLabels) {
    return '';
  }

  const configured = conceptualStyle?.relationEdgeLabels[relation.id]?.[side];
  if (configured) {
    return configured;
  }

  return side === 'source' ? sourceCardinalityLabel(relation) : targetCardinalityLabel(relation);
}

function rankColumns(columns: ColumnModel[]): ColumnModel[] {
  return [...columns].sort((left, right) => columnRank(left) - columnRank(right));
}

function columnRank(column: ColumnModel): number {
  if (column.isPrimaryKey) {
    return 0;
  }

  if (DESCRIPTOR_COLUMN_PATTERN.test(column.name)) {
    return 1;
  }

  if (column.isUnique) {
    return 2;
  }

  if (IMPORTANT_COLUMN_PATTERN.test(column.name)) {
    return 3;
  }

  return 4;
}

function isTechnicalColumn(column: ColumnModel): boolean {
  const normalizedName = column.name.toLowerCase();
  return (
    TECHNICAL_COLUMN_NAMES.has(normalizedName) ||
    normalizedName.endsWith('_at') ||
    normalizedName.endsWith('_time') ||
    normalizedName.endsWith('_by')
  );
}

function toConceptualRelation(
  relation: RelationModel,
  tableById: Map<string, TableModel>,
  conceptualStyle: ConceptualStyle | null
): RelationModel {
  return {
    ...relation,
    name: conceptualRelationName(relation, tableById, conceptualStyle),
  };
}

function conceptualRelationName(
  relation: RelationModel,
  tableById: Map<string, TableModel>,
  conceptualStyle: ConceptualStyle | null
): string {
  const configuredName = conceptualStyle?.relationNames[relation.id];
  if (configuredName) {
    return configuredName;
  }

  const sourceTable = tableById.get(relation.sourceTableId);
  const targetTable = tableById.get(relation.targetTableId);
  const commentName = relation.sourceColumnIds
    .map((columnId) => sourceTable?.columns.find((column) => column.id === columnId))
    .map((column) => columnConceptName(column?.comment))
    .find(Boolean);

  if (commentName) {
    return commentName;
  }

  const targetConceptName = tableConceptName(targetTable);
  if (targetConceptName) {
    return targetConceptName;
  }

  const roleName = relation.sourceColumnIds.map(columnRoleName).find(Boolean);
  if (roleName) {
    return roleName;
  }

  const normalizedName = relation.name
    .replace(/^fk_/i, '')
    .replace(/^inferred_/i, '')
    .replace(/_/g, ' ')
    .trim();
  return normalizedName || relation.name;
}

function columnConceptName(comment: string | undefined): string {
  if (!comment || !CJK_TEXT.test(comment)) {
    return '';
  }

  return stripConceptSuffix(comment);
}

function tableConceptName(table: TableModel | undefined): string {
  const candidate = table?.comment || table?.displayName;
  if (!candidate || !CJK_TEXT.test(candidate)) {
    return '';
  }

  return stripConceptSuffix(candidate);
}

function stripConceptSuffix(value: string): string {
  return value
    .trim()
    .replace(
      /(编号|代码|编码|标识|ID|id|名称|名字|姓名|表|信息|资料|数据|明细|记录)+$/u,
      ''
    )
    .trim();
}

function columnRoleName(columnId: string): string {
  const normalized = columnId.toLowerCase();
  const withoutId = normalized.replace(/_?id$/, '');
  const roleDictionary: Record<string, string> = {
    account: '账户',
    user: '用户',
    passenger: '乘车人',
    train: '车次',
    train_run: '开行',
    order: '订单',
    ticket_order: '订单',
    ticket: '车票',
    payment: '支付',
    refund: '退票',
    change: '改签',
    waitlist: '候补',
    station: '车站',
    origin_station: '起点站',
    start_station: '起点站',
    from_station: '起点站',
    departure_station: '起点站',
    destination_station: '终点站',
    end_station: '终点站',
    to_station: '终点站',
    arrival_station: '终点站',
    seat: '座位',
    seat_type: '席别',
    carriage: '车厢',
  };

  return roleDictionary[withoutId] ?? '';
}

function toEntityNode(
  table: TableModel,
  index: number,
  columnCount: number,
  conceptualStyle: ConceptualStyle | null
): ErNode {
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;
  const center = conceptualStyle?.entityPositions[table.id] ?? {
    x: column * CLUSTER_WIDTH + CLUSTER_WIDTH / 2,
    y: row * CLUSTER_HEIGHT + CLUSTER_HEIGHT / 2,
  };

  return {
    id: entityNodeId(table.id),
    type: 'chenEntity',
    position: centerToPosition(center, ENTITY_WIDTH, ENTITY_HEIGHT),
    width: ENTITY_WIDTH,
    height: ENTITY_HEIGHT,
    data: { table: displayTableFor(table, conceptualStyle) },
  };
}

function addNode(
  node: ErNode,
  nodes: ErNode[],
  placements: Map<string, NodePlacement>
): void {
  nodes.push(node);
  placements.set(node.id, {
    id: node.id,
    center: {
      x: node.position.x + (node.width ?? ENTITY_WIDTH) / 2,
      y: node.position.y + (node.height ?? ENTITY_HEIGHT) / 2,
    },
    width: node.width ?? ENTITY_WIDTH,
    height: node.height ?? ENTITY_HEIGHT,
  });
}

function sourceCardinalityLabel(relation: RelationModel): string {
  return oneOrManyLabel(
    !(relation.cardinality === 'one-to-one' || relation.cardinality === 'one-to-many')
  );
}

function targetCardinalityLabel(relation: RelationModel): string {
  return oneOrManyLabel(
    !(relation.cardinality === 'one-to-one' || relation.cardinality === 'many-to-one')
  );
}
