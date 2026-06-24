import type { ErModel } from '../domain/er-model';
import type { ConceptualStyle, Point } from './chen-types';

export const TICKETING_TABLE_LABELS: Record<string, string> = {
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

export const TICKETING_COLUMN_LABELS: Record<string, Record<string, string>> = {
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

export const TICKETING_ENTITY_POSITIONS: Record<string, Point> = {
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

export const TICKETING_RELATION_POSITIONS: Record<string, Point> = {
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

export const TICKETING_ATTRIBUTE_POSITIONS: Record<string, Record<string, Point>> = {
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

export const TICKETING_ATTRIBUTE_ANGLES: Record<string, number[]> = {
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

export function detectConceptualStyle(model: ErModel): ConceptualStyle | null {
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
    relations.map((relation) => [
      `${relation.sourceTableId}.${relation.sourceColumnIds.join(',')}->${relation.targetTableId}`,
      relation,
    ])
  );
  const relationNames: Record<string, string> = {};
  const relationEdgeLabels: Record<string, { source: string; target: string }> = {};

  function addRelation(
    source: string,
    sourceColumns: string[],
    target: string,
    name: string,
    sourceLabel: string,
    targetLabel: string
  ): void {
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
