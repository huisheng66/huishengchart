import type { ColumnModel, ErModel, RelationModel, TableModel } from '../domain/er-model';
import { oneOrManyLabel } from '../domain/display-labels';
import type { ErEdge, ErNode, FlowGraph } from './react-flow-types';

const ENTITY_WIDTH = 148;
const ENTITY_HEIGHT = 56;
const ATTRIBUTE_WIDTH = 134;
const ATTRIBUTE_HEIGHT = 46;
const CLUSTER_WIDTH = 860;
const CLUSTER_HEIGHT = 600;
const RELATIONSHIP_SIZE = 68;
const ATTRIBUTE_RADIUS_X = 138;
const ATTRIBUTE_RADIUS_Y = 98;
const ATTRIBUTE_RADIUS_STEP_X = 18;
const ATTRIBUTE_RADIUS_STEP_Y = 14;
const NODE_CLEARANCE = 14;
const RELATIONSHIP_PARALLEL_GAP = 72;
const RELATIONSHIP_AVOID_GAP = 120;
const MAX_ENTITY_ATTRIBUTES = 6;
const MAX_DENSE_ENTITY_ATTRIBUTES = 2;
const MAX_RELATIONSHIP_ATTRIBUTES = 4;
const DENSE_CARDINALITY_LABEL_THRESHOLD = 12;
const DENSE_ENTITY_THRESHOLD = 6;
const HANDLE_SIDES: HandleSide[] = ['left', 'right', 'top', 'bottom'];

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

const CJK_TEXT = /[\u3400-\u9fff]/u;
const DESCRIPTOR_COLUMN_PATTERN = /(^name$|_name$|^title$|_title$|^label$|_label$|^code$|_code$|^no$|_no$|number$|_number$)/i;
const IMPORTANT_COLUMN_PATTERN = /(status|state|type|amount|price|total|quantity|count|date|time|score|grade|level)/i;

type Point = {
  x: number;
  y: number;
};

type HandleSide = 'left' | 'right' | 'top' | 'bottom';

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type NodePlacement = {
  id: string;
  center: Point;
  width: number;
  height: number;
};

type ChenEdgeData = {
  relation?: RelationModel;
  label: string;
  inferred: boolean;
};

type AssociativeRelationship = {
  table: TableModel;
  relations: RelationModel[];
  relationship: RelationModel;
  attributeColumns: ColumnModel[];
};

type ConceptualStyle = {
  tableLabels: Record<string, string>;
  columnLabels: Record<string, Record<string, string>>;
  relationNames: Record<string, string>;
  relationEdgeLabels: Record<string, { source: string; target: string }>;
  extraRelations: RelationModel[];
  entityPositions: Record<string, Point>;
  relationPositions: Record<string, Point>;
  attributePositions: Record<string, Record<string, Point>>;
  attributeAngles: Record<string, number[]>;
  showCardinalityLabels: boolean;
};

const TICKETING_TABLE_LABELS: Record<string, string> = {
  account: '账号',
  passenger: '乘车人',
  ticket_order: '订单',
  ticket: '车票',
  train_run: '列车开行实例',
  train: '列车',
  train_stop: '经停站',
  station: '车站',
  waitlist_order: '候补订单',
  payment_record: '支付记录',
  refund_record: '退票记录',
  change_record: '改签记录',
  notification_message: '通知消息',
  run_fare: '区间票价',
  run_leg_inventory: '区间库存',
  carriage: '车厢',
  seat: '座位',
  seat_type: '座席类型',
};

const TICKETING_COLUMN_LABELS: Record<string, Record<string, string>> = {
  account: {
    username: '用户名',
    phone: '手机号',
  },
  passenger: {
    name: '姓名',
    id_no: '证件号',
  },
  ticket_order: {
    order_no: '订单号',
    order_status: '状态',
  },
  ticket: {
    ticket_no: '车票号',
    ticket_status: '票状态',
  },
  train_run: {
    run_date: '开行日期',
    run_status: '开行状态',
  },
  train: {
    train_no: '车次号',
    train_type: '类型',
  },
  train_stop: {
    stop_index: '站序',
  },
  station: {
    station_name: '站名',
    city_name: '城市',
  },
  waitlist_order: {
    waitlist_no: '候补单号',
    waitlist_status: '候补状态',
  },
  payment_record: {
    payment_no: '支付单号',
    pay_status: '支付状态',
  },
  refund_record: {
    refund_no: '退票单号',
    refund_status: '退票状态',
  },
  change_record: {
    change_no: '改签单号',
    change_status: '改签状态',
  },
  notification_message: {
    send_status: '发送状态',
  },
  run_fare: {
    price: '价格',
  },
  run_leg_inventory: {
    available_count: '余票数',
  },
  carriage: {
    carriage_no: '车厢号',
  },
  seat: {
    seat_no: '座位号',
  },
  seat_type: {
    seat_type_name: '席别名称',
  },
};

const TICKETING_ENTITY_POSITIONS: Record<string, Point> = {
  account: { x: 180, y: 560 },
  passenger: { x: 500, y: 240 },
  ticket_order: { x: 500, y: 560 },
  ticket: { x: 800, y: 560 },
  train_run: { x: 1080, y: 560 },
  train: { x: 1340, y: 560 },
  train_stop: { x: 1600, y: 560 },
  station: { x: 1900, y: 560 },
  waitlist_order: { x: 180, y: 920 },
  notification_message: { x: -120, y: 1320 },
  payment_record: { x: 500, y: 920 },
  refund_record: { x: 700, y: 1320 },
  change_record: { x: 940, y: 1320 },
  run_fare: { x: 1080, y: 920 },
  run_leg_inventory: { x: 1160, y: 1320 },
  carriage: { x: 1340, y: 920 },
  seat: { x: 1340, y: 1320 },
  seat_type: { x: 1700, y: 1320 },
};

const TICKETING_RELATION_POSITIONS: Record<string, Point> = {
  'passenger:account_id->account:id': { x: 330, y: 470 },
  'ticket_order:account_id->account:id': { x: 340, y: 560 },
  'waitlist_order:account_id->account:id': { x: 180, y: 740 },
  'notification_message:account_id->account:id': { x: -120, y: 1110 },
  'ticket:order_id->ticket_order:id': { x: 650, y: 560 },
  'ticket:passenger_id->passenger:id': { x: 690, y: 350 },
  'ticket:train_run_id->train_run:id': { x: 940, y: 560 },
  'ticket:seat_id->seat:id': { x: 800, y: 1080 },
  'payment_record:order_id->ticket_order:id': { x: 500, y: 740 },
  'refund_record:ticket_id->ticket:id': { x: 700, y: 940 },
  'change_record:old_ticket_id->ticket:id': { x: 940, y: 940 },
  'train_run:train_id->train:id': { x: 1210, y: 560 },
  'train_stop:train_id->train:id': { x: 1470, y: 560 },
  'train_stop:station_id->station:id': { x: 1750, y: 560 },
  'carriage:train_id->train:id': { x: 1340, y: 740 },
  'seat:carriage_id->carriage:id': { x: 1340, y: 1110 },
  'seat:seat_type_id->seat_type:id': { x: 1520, y: 1320 },
  'run_fare:train_run_id->train_run:id': { x: 1080, y: 740 },
  'run_leg_inventory:train_run_id->train_run:id': { x: 1210, y: 1040 },
  'run_leg_inventory:seat_type_id->seat_type:id': { x: 1450, y: 1110 },
};

const TICKETING_ATTRIBUTE_POSITIONS: Record<string, Record<string, Point>> = {
  account: {
    username: { x: 30, y: 430 },
    phone: { x: 180, y: 360 },
  },
  passenger: {
    name: { x: 410, y: 110 },
    id_no: { x: 590, y: 110 },
  },
  ticket_order: {
    order_no: { x: 470, y: 360 },
    order_status: { x: 610, y: 455 },
  },
  ticket: {
    ticket_no: { x: 830, y: 330 },
    ticket_status: { x: 930, y: 430 },
  },
  train_run: {
    run_date: { x: 1050, y: 360 },
    run_status: { x: 1190, y: 470 },
  },
  train: {
    train_no: { x: 1340, y: 360 },
    train_type: { x: 1455, y: 430 },
  },
  train_stop: {
    stop_index: { x: 1640, y: 410 },
  },
  station: {
    station_name: { x: 1850, y: 410 },
    city_name: { x: 2020, y: 410 },
  },
  waitlist_order: {
    waitlist_no: { x: 40, y: 1060 },
    waitlist_status: { x: 240, y: 1060 },
  },
  payment_record: {
    payment_no: { x: 420, y: 1060 },
    pay_status: { x: 580, y: 1060 },
  },
  refund_record: {
    refund_no: { x: 560, y: 1640 },
    refund_status: { x: 720, y: 1640 },
  },
  change_record: {
    change_no: { x: 900, y: 1640 },
    change_status: { x: 1080, y: 1640 },
  },
  notification_message: {
    send_status: { x: -120, y: 1640 },
  },
  run_fare: {
    price: { x: 1020, y: 1040 },
  },
  run_leg_inventory: {
    available_count: { x: 1260, y: 1640 },
  },
  carriage: {
    carriage_no: { x: 1510, y: 920 },
  },
  seat: {
    seat_no: { x: 1440, y: 1640 },
  },
  seat_type: {
    seat_type_name: { x: 1700, y: 1640 },
  },
};

const TICKETING_ATTRIBUTE_ANGLES: Record<string, number[]> = {
  account: [-145, -105],
  passenger: [-125, -55],
  ticket_order: [-115, -65],
  ticket: [-135, -75],
  train_run: [-90, -45],
  train: [-125, -75],
  train_stop: [-90],
  station: [-135, -45],
  waitlist_order: [180, 0],
  payment_record: [180, 0],
  refund_record: [-135, -45],
  change_record: [-135, -45],
  notification_message: [-90],
  run_fare: [-45],
  run_leg_inventory: [135],
  carriage: [45],
  seat: [90],
  seat_type: [90],
};

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
    (relation) => !associativeTableIds.has(relation.sourceTableId) && !associativeTableIds.has(relation.targetTableId)
  );
  const tableById = new Map(model.tables.map((table) => [table.id, table]));
  const visibleRelations = selectVisibleRelations(normalRelations, conceptualStyle);
  const conceptualRelations = [
    ...visibleRelations.map((relation) => toConceptualRelation(relation, tableById, conceptualStyle)),
    ...(conceptualStyle?.extraRelations ?? []),
  ];
  const denseDiagram = entityTables.length > DENSE_ENTITY_THRESHOLD || normalRelations.length + associativeRelationships.size > DENSE_CARDINALITY_LABEL_THRESHOLD;
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
    const fallbackAttributePositions = placeAttributes(entityPlacement.center, conceptualColumns.length, conceptualStyle?.attributeAngles[table.id]);
    const attributePositions = conceptualColumns.map((column, columnIndex) => {
      const configuredCenter = conceptualStyle?.attributePositions[table.id]?.[column.id];
      return configuredCenter ? centerToPosition(configuredCenter, ATTRIBUTE_WIDTH, ATTRIBUTE_HEIGHT) : fallbackAttributePositions[columnIndex];
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
          data: { table: displayTable, column: displayColumnFor(table, column, conceptualStyle) },
        },
        nodes,
        placements
      );
      edges.push(createStraightEdge(`edge:${entityId}:${attributeId}`, entityId, attributeId, { label: '', inferred: false }, placements));
    });
  });

  const relationCounts = countRelationsByPair(conceptualRelations);
  const usedRelationIndexes = new Map<string, number>();

  conceptualRelations.forEach((relation) => {
    const relationshipId = relationshipNodeId(relation.id);
    const relationshipCenter =
      conceptualStyle?.relationPositions[relation.id] ?? placeRelationship(relation, relationCounts, usedRelationIndexes, placements);
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
    const relationshipCenter = placeAssociativeRelationship(associativeRelationship, placements);
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
            label: cardinalityLabelFor(associativeRelationship.relationship, 'source', showCardinalityLabels, conceptualStyle),
            inferred: relation.source !== 'foreign-key',
          },
          placements
        )
      );
    });

    const attributePositions = placeAttributes(relationshipCenter, associativeRelationship.attributeColumns.length);
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
      edges.push(createStraightEdge(`edge:${relationshipId}:${attributeId}`, relationshipId, attributeId, { label: '', inferred: false }, placements));
    });
  });

  return { nodes, edges, layoutStrategy: 'manual' };
}

function identifyAssociativeRelationships(tables: TableModel[], relations: RelationModel[]): Map<string, AssociativeRelationship> {
  const associativeRelationships = new Map<string, AssociativeRelationship>();

  tables.forEach((table) => {
    const outgoingRelations = relations.filter((relation) => relation.sourceTableId === table.id);
    const foreignKeyColumnIds = new Set(outgoingRelations.flatMap((relation) => relation.sourceColumnIds));
    const targetTableIds = new Set(outgoingRelations.map((relation) => relation.targetTableId));
    const primaryKeyIsForeignKeys = table.primaryKey.length >= 2 && table.primaryKey.every((columnId) => foreignKeyColumnIds.has(columnId));

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
        source: outgoingRelations.some((relation) => relation.source !== 'foreign-key') ? 'rule-inferred' : 'foreign-key',
        reason: 'associative-table',
      },
      attributeColumns: selectRelationshipAttributes(table, foreignKeyColumnIds),
    });
  });

  return associativeRelationships;
}

function selectEntityAttributes(table: TableModel, denseDiagram: boolean, conceptualStyle: ConceptualStyle | null): ColumnModel[] {
  const conceptualColumnNames = conceptualStyle?.columnLabels[table.id];
  if (conceptualColumnNames) {
    return table.columns.filter((column) => Boolean(conceptualColumnNames[column.id]));
  }

  const candidates = table.columns.filter((column) => !column.isForeignKey && !isTechnicalColumn(column));
  const conceptualCandidates = denseDiagram ? candidates.filter((column) => !column.isPrimaryKey) : candidates;
  return rankColumns(conceptualCandidates.length > 0 ? conceptualCandidates : candidates).slice(
    0,
    denseDiagram ? MAX_DENSE_ENTITY_ATTRIBUTES : MAX_ENTITY_ATTRIBUTES
  );
}

function selectRelationshipAttributes(table: TableModel, foreignKeyColumnIds: Set<string>): ColumnModel[] {
  const candidates = table.columns.filter((column) => !foreignKeyColumnIds.has(column.id) && !isTechnicalColumn(column));
  return rankColumns(candidates).slice(0, MAX_RELATIONSHIP_ATTRIBUTES);
}

function selectVisibleRelations(relations: RelationModel[], conceptualStyle: ConceptualStyle | null): RelationModel[] {
  if (!conceptualStyle) {
    return relations;
  }

  const relationIds = new Set(Object.keys(conceptualStyle.relationNames));
  return relations.filter((relation) => relationIds.has(relation.id));
}

function detectConceptualStyle(model: ErModel): ConceptualStyle | null {
  const tableIds = new Set(model.tables.map((table) => table.id));
  const requiredTables = [
    'account',
    'passenger',
    'ticket_order',
    'ticket',
    'train_run',
    'train',
    'train_stop',
    'station',
    'seat',
    'seat_type',
  ];

  if (!requiredTables.every((tableId) => tableIds.has(tableId))) {
    return null;
  }

  const relations = [...model.relations, ...model.inferredRelations];
  const relationByColumns = new Map(
    relations.map((relation) => [`${relation.sourceTableId}.${relation.sourceColumnIds.join(',')}->${relation.targetTableId}`, relation])
  );
  const relationNames: Record<string, string> = {};
  const relationEdgeLabels: Record<string, { source: string; target: string }> = {};

  function addRelation(source: string, sourceColumns: string[], target: string, name: string, sourceLabel: string, targetLabel: string): void {
    const relation = relationByColumns.get(`${source}.${sourceColumns.join(',')}->${target}`);
    if (!relation) {
      return;
    }

    relationNames[relation.id] = name;
    relationEdgeLabels[relation.id] = { source: sourceLabel, target: targetLabel };
  }

  addRelation('passenger', ['account_id'], 'account', '维护', 'n', '1');
  addRelation('ticket_order', ['account_id'], 'account', '创建', 'n', '1');
  addRelation('waitlist_order', ['account_id'], 'account', '创建', 'n', '1');
  addRelation('notification_message', ['account_id'], 'account', '接收', 'n', '1');
  addRelation('ticket', ['order_id'], 'ticket_order', '包含', 'n', '1');
  addRelation('ticket', ['passenger_id'], 'passenger', '对应', 'n', '1');
  addRelation('ticket', ['train_run_id'], 'train_run', '对应', 'n', '1');
  addRelation('ticket', ['seat_id'], 'seat', '维护', '0..n', '0..1');
  addRelation('payment_record', ['order_id'], 'ticket_order', '支付', '0..n', '1');
  addRelation('refund_record', ['ticket_id'], 'ticket', '退票', '0..1', '1');
  addRelation('change_record', ['old_ticket_id'], 'ticket', '改签', '0..1', '1');
  addRelation('train_run', ['train_id'], 'train', '形成', 'n', '1');
  addRelation('train_stop', ['train_id'], 'train', '包含', 'n', '1');
  addRelation('train_stop', ['station_id'], 'station', '对应', 'n', '1');
  addRelation('carriage', ['train_id'], 'train', '包含', 'n', '1');
  addRelation('seat', ['carriage_id'], 'carriage', '包含', 'n', '1');
  addRelation('seat', ['seat_type_id'], 'seat_type', '定义', 'n', '1');
  addRelation('run_fare', ['train_run_id'], 'train_run', '对应', 'n', '1');
  addRelation('run_leg_inventory', ['train_run_id'], 'train_run', '对应', 'n', '1');
  addRelation('run_leg_inventory', ['seat_type_id'], 'seat_type', '分配', 'n', 'm');

  return {
    tableLabels: TICKETING_TABLE_LABELS,
    columnLabels: TICKETING_COLUMN_LABELS,
    relationNames,
    relationEdgeLabels,
    extraRelations: [],
    entityPositions: TICKETING_ENTITY_POSITIONS,
    relationPositions: TICKETING_RELATION_POSITIONS,
    attributePositions: TICKETING_ATTRIBUTE_POSITIONS,
    attributeAngles: TICKETING_ATTRIBUTE_ANGLES,
    showCardinalityLabels: true,
  };
}

function displayTableFor(table: TableModel, conceptualStyle: ConceptualStyle | null): TableModel {
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

function displayColumnFor(table: TableModel, column: ColumnModel, conceptualStyle: ConceptualStyle | null): ColumnModel {
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

function conceptualRelationName(relation: RelationModel, tableById: Map<string, TableModel>, conceptualStyle: ConceptualStyle | null): string {
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

  const normalizedName = relation.name.replace(/^fk_/i, '').replace(/^inferred_/i, '').replace(/_/g, ' ').trim();
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
    .replace(/(编号|代码|编码|标识|ID|id|名称|名字|姓名|表|信息|资料|数据|明细|记录)+$/u, '')
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

function toEntityNode(table: TableModel, index: number, columnCount: number, conceptualStyle: ConceptualStyle | null): ErNode {
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

function addNode(node: ErNode, nodes: ErNode[], placements: Map<string, NodePlacement>): void {
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

function placeAttributes(entityCenter: Point, attributeCount: number, preferredDegrees?: number[]): Point[] {
  const angles = preferredDegrees?.slice(0, attributeCount).map(toRadians) ?? attributeAngles(attributeCount);
  let latestPositions: Point[] = [];

  for (let attempt = 0; attempt < 8; attempt++) {
    const radiusX = ATTRIBUTE_RADIUS_X + attempt * ATTRIBUTE_RADIUS_STEP_X;
    const radiusY = ATTRIBUTE_RADIUS_Y + attempt * ATTRIBUTE_RADIUS_STEP_Y;
    latestPositions = angles.map((angle) =>
      centerToPosition(
        {
          x: entityCenter.x + Math.cos(angle) * radiusX,
          y: entityCenter.y + Math.sin(angle) * radiusY,
        },
        ATTRIBUTE_WIDTH,
        ATTRIBUTE_HEIGHT
      )
    );

    const boxes = [
      {
        id: 'entity',
        center: entityCenter,
        width: ENTITY_WIDTH,
        height: ENTITY_HEIGHT,
      },
      ...latestPositions.map((position, index) => ({
        id: `attribute:${index}`,
        center: {
          x: position.x + ATTRIBUTE_WIDTH / 2,
          y: position.y + ATTRIBUTE_HEIGHT / 2,
        },
        width: ATTRIBUTE_WIDTH,
        height: ATTRIBUTE_HEIGHT,
      })),
    ];

    if (!hasOverlaps(boxes)) {
      return latestPositions;
    }
  }

  return latestPositions;
}

function attributeAngles(attributeCount: number): number[] {
  if (attributeCount === 0) {
    return [];
  }

  if (attributeCount === 1) {
    return [toRadians(-90)];
  }

  if (attributeCount === 2) {
    return [toRadians(-140), toRadians(-30)];
  }

  return Array.from({ length: attributeCount }, (_, index) => toRadians(-90 + (360 * index) / attributeCount));
}

function placeRelationship(
  relation: RelationModel,
  relationCounts: Map<string, number>,
  usedRelationIndexes: Map<string, number>,
  placements: Map<string, NodePlacement>
): Point {
  const source = placements.get(entityNodeId(relation.sourceTableId));
  const target = placements.get(entityNodeId(relation.targetTableId));

  if (!source || !target) {
    return { x: 0, y: 0 };
  }

  const pairKey = relationPairKey(relation);
  const usedIndex = usedRelationIndexes.get(pairKey) ?? 0;
  usedRelationIndexes.set(pairKey, usedIndex + 1);

  const totalForPair = relationCounts.get(pairKey) ?? 1;
  const offsetIndex = usedIndex - (totalForPair - 1) / 2;
  const vector = normalize({
    x: target.center.x - source.center.x,
    y: target.center.y - source.center.y,
  });
  const perpendicular = { x: -vector.y, y: vector.x };
  const midpoint = {
    x: (source.center.x + target.center.x) / 2 + perpendicular.x * offsetIndex * RELATIONSHIP_PARALLEL_GAP,
    y: (source.center.y + target.center.y) / 2 + perpendicular.y * offsetIndex * RELATIONSHIP_PARALLEL_GAP,
  };
  const candidates = [
    midpoint,
    offsetPoint(midpoint, perpendicular, RELATIONSHIP_AVOID_GAP),
    offsetPoint(midpoint, perpendicular, -RELATIONSHIP_AVOID_GAP),
    offsetPoint(midpoint, perpendicular, RELATIONSHIP_AVOID_GAP * 2),
    offsetPoint(midpoint, perpendicular, -RELATIONSHIP_AVOID_GAP * 2),
    offsetPoint(midpoint, vector, RELATIONSHIP_AVOID_GAP),
    offsetPoint(midpoint, vector, -RELATIONSHIP_AVOID_GAP),
  ];

  return (
    candidates.find((candidate) => !overlapsAny(boxFromCenter('relationship', candidate, RELATIONSHIP_SIZE, RELATIONSHIP_SIZE), placements)) ??
    midpoint
  );
}

function placeAssociativeRelationship(associativeRelationship: AssociativeRelationship, placements: Map<string, NodePlacement>): Point {
  const entityPlacements = associativeRelationship.relations
    .map((relation) => placements.get(entityNodeId(relation.targetTableId)))
    .filter((placement): placement is NodePlacement => Boolean(placement));

  if (entityPlacements.length === 0) {
    return { x: 0, y: 0 };
  }

  const center = {
    x: entityPlacements.reduce((sum, placement) => sum + placement.center.x, 0) / entityPlacements.length,
    y: entityPlacements.reduce((sum, placement) => sum + placement.center.y, 0) / entityPlacements.length,
  };
  const candidates = [
    center,
    offsetPoint(center, { x: 0, y: 1 }, RELATIONSHIP_AVOID_GAP),
    offsetPoint(center, { x: 0, y: -1 }, RELATIONSHIP_AVOID_GAP),
    offsetPoint(center, { x: 1, y: 0 }, RELATIONSHIP_AVOID_GAP),
    offsetPoint(center, { x: -1, y: 0 }, RELATIONSHIP_AVOID_GAP),
  ];

  return (
    candidates.find((candidate) => !overlapsAny(boxFromCenter('relationship', candidate, RELATIONSHIP_SIZE, RELATIONSHIP_SIZE), placements)) ??
    center
  );
}

function countRelationsByPair(relations: RelationModel[]): Map<string, number> {
  const counts = new Map<string, number>();

  relations.forEach((relation) => {
    const pairKey = relationPairKey(relation);
    counts.set(pairKey, (counts.get(pairKey) ?? 0) + 1);
  });

  return counts;
}

function createStraightEdge(
  id: string,
  source: string,
  target: string,
  data: ChenEdgeData,
  placements: Map<string, NodePlacement>
): ErEdge {
  const sourcePlacement = placements.get(source);
  const targetPlacement = placements.get(target);
  const handles =
    sourcePlacement && targetPlacement
      ? chooseStraightEdgeHandles(sourcePlacement, targetPlacement, placements)
      : { sourceHandle: undefined, targetHandle: undefined };

  return {
    id,
    type: 'relationship',
    source,
    target,
    sourceHandle: handles.sourceHandle,
    targetHandle: handles.targetHandle,
    data: { ...data, edgeStyle: 'straight' },
  };
}

function chooseStraightEdgeHandles(
  source: NodePlacement,
  target: NodePlacement,
  placements: Map<string, NodePlacement>
): { sourceHandle: string; targetHandle: string } {
  const preferredSourceSide = sideFor(source, target);
  const preferredTargetSide = sideFor(target, source);
  let sourceSide = preferredSourceSide;
  let targetSide = preferredTargetSide;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidateSourceSide of orderedHandleSides(preferredSourceSide)) {
    for (const candidateTargetSide of orderedHandleSides(preferredTargetSide)) {
      const start = handlePoint(source, candidateSourceSide);
      const end = handlePoint(target, candidateTargetSide);
      const crossedNodeCount = countNodesCrossedBySegment(start, end, source.id, target.id, placements);
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const sourcePenalty = candidateSourceSide === preferredSourceSide ? 0 : 1;
      const targetPenalty = candidateTargetSide === preferredTargetSide ? 0 : 1;
      const score = crossedNodeCount * 100_000 + sourcePenalty * 1_000 + targetPenalty * 1_000 + length;

      if (score < bestScore) {
        sourceSide = candidateSourceSide;
        targetSide = candidateTargetSide;
        bestScore = score;
      }
    }
  }

  return {
    sourceHandle: `source:${sourceSide}`,
    targetHandle: `target:${targetSide}`,
  };
}

function orderedHandleSides(preferred: HandleSide): HandleSide[] {
  return [preferred, ...HANDLE_SIDES.filter((side) => side !== preferred)];
}

function sideFor(from: NodePlacement, to: NodePlacement): HandleSide {
  const dx = to.center.x - from.center.x;
  const dy = to.center.y - from.center.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }

  return dy >= 0 ? 'bottom' : 'top';
}

function handlePoint(placement: NodePlacement, side: HandleSide): Point {
  if (placement.id.startsWith('relationship:')) {
    return rotatedRelationshipHandlePoint(placement, side);
  }

  if (side === 'left') {
    return { x: placement.center.x - placement.width / 2, y: placement.center.y };
  }

  if (side === 'right') {
    return { x: placement.center.x + placement.width / 2, y: placement.center.y };
  }

  if (side === 'top') {
    return { x: placement.center.x, y: placement.center.y - placement.height / 2 };
  }

  return { x: placement.center.x, y: placement.center.y + placement.height / 2 };
}

function rotatedRelationshipHandlePoint(placement: NodePlacement, side: HandleSide): Point {
  const offset =
    side === 'left'
      ? { x: -placement.width / 2, y: 0 }
      : side === 'right'
        ? { x: placement.width / 2, y: 0 }
        : side === 'top'
          ? { x: 0, y: -placement.height / 2 }
          : { x: 0, y: placement.height / 2 };
  const angle = Math.PI / 4;
  const rotatedOffset = {
    x: offset.x * Math.cos(angle) - offset.y * Math.sin(angle),
    y: offset.x * Math.sin(angle) + offset.y * Math.cos(angle),
  };

  return {
    x: placement.center.x + rotatedOffset.x,
    y: placement.center.y + rotatedOffset.y,
  };
}

function countNodesCrossedBySegment(
  start: Point,
  end: Point,
  sourceId: string,
  targetId: string,
  placements: Map<string, NodePlacement>
): number {
  return [...placements.values()].filter(
    (placement) =>
      placement.id !== sourceId &&
      placement.id !== targetId &&
      segmentIntersectsRect(start, end, rectWithClearance(placement))
  ).length;
}

function segmentIntersectsRect(start: Point, end: Point, rect: Rect): boolean {
  if (pointInsideRect(start, rect) || pointInsideRect(end, rect)) {
    return true;
  }

  return [
    [{ x: rect.left, y: rect.top }, { x: rect.right, y: rect.top }],
    [{ x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }],
    [{ x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }],
    [{ x: rect.left, y: rect.bottom }, { x: rect.left, y: rect.top }],
  ].some(([rectStart, rectEnd]) => segmentsIntersect(start, end, rectStart, rectEnd));
}

function pointInsideRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function segmentsIntersect(firstStart: Point, firstEnd: Point, secondStart: Point, secondEnd: Point): boolean {
  const firstDirection = direction(firstStart, firstEnd, secondStart);
  const secondDirection = direction(firstStart, firstEnd, secondEnd);
  const thirdDirection = direction(secondStart, secondEnd, firstStart);
  const fourthDirection = direction(secondStart, secondEnd, firstEnd);

  if (firstDirection === 0 && pointOnSegment(secondStart, firstStart, firstEnd)) {
    return true;
  }

  if (secondDirection === 0 && pointOnSegment(secondEnd, firstStart, firstEnd)) {
    return true;
  }

  if (thirdDirection === 0 && pointOnSegment(firstStart, secondStart, secondEnd)) {
    return true;
  }

  if (fourthDirection === 0 && pointOnSegment(firstEnd, secondStart, secondEnd)) {
    return true;
  }

  return firstDirection * secondDirection < 0 && thirdDirection * fourthDirection < 0;
}

function direction(origin: Point, target: Point, point: Point): number {
  const crossProduct = (target.x - origin.x) * (point.y - origin.y) - (target.y - origin.y) * (point.x - origin.x);

  if (Math.abs(crossProduct) < 0.001) {
    return 0;
  }

  return crossProduct > 0 ? 1 : -1;
}

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  return (
    point.x >= Math.min(start.x, end.x) &&
    point.x <= Math.max(start.x, end.x) &&
    point.y >= Math.min(start.y, end.y) &&
    point.y <= Math.max(start.y, end.y)
  );
}

function relationPairKey(relation: RelationModel): string {
  return [relation.sourceTableId, relation.targetTableId].sort().join('::');
}

function centerToPosition(center: Point, width: number, height: number): Point {
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
  };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function normalize(point: Point): Point {
  const length = Math.hypot(point.x, point.y);

  if (length === 0) {
    return { x: 1, y: 0 };
  }

  return {
    x: point.x / length,
    y: point.y / length,
  };
}

function offsetPoint(point: Point, direction: Point, distance: number): Point {
  return {
    x: point.x + direction.x * distance,
    y: point.y + direction.y * distance,
  };
}

function hasOverlaps(boxes: NodePlacement[]): boolean {
  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex++) {
      if (boxesOverlap(boxes[leftIndex], boxes[rightIndex])) {
        return true;
      }
    }
  }

  return false;
}

function overlapsAny(box: NodePlacement, placements: Map<string, NodePlacement>): boolean {
  return [...placements.values()].some((placement) => boxesOverlap(box, placement));
}

function boxesOverlap(left: NodePlacement, right: NodePlacement): boolean {
  const leftRect = rectWithClearance(left);
  const rightRect = rectWithClearance(right);

  return !(
    leftRect.right <= rightRect.left ||
    rightRect.right <= leftRect.left ||
    leftRect.bottom <= rightRect.top ||
    rightRect.bottom <= leftRect.top
  );
}

function rectWithClearance(box: NodePlacement) {
  return {
    left: box.center.x - box.width / 2 - NODE_CLEARANCE,
    top: box.center.y - box.height / 2 - NODE_CLEARANCE,
    right: box.center.x + box.width / 2 + NODE_CLEARANCE,
    bottom: box.center.y + box.height / 2 + NODE_CLEARANCE,
  };
}

function boxFromCenter(id: string, center: Point, width: number, height: number): NodePlacement {
  return { id, center, width, height };
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
