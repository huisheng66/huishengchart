import { activeRelations, type ColumnModel, type DiagramModel, type RelationModel, type TableModel } from '../domain/er-model';
import type { ConceptualStyle, Point } from './chen-types';

type SemanticGroup = 'actor' | 'process' | 'core' | 'reference' | 'log' | 'other';

const MAX_ENTITY_ATTRIBUTES = 5;
const MAX_DENSE_ENTITY_ATTRIBUTES = 3;
const MAX_VISIBLE_DENSE_RELATIONS = 18;

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

const EXACT_LABELS: Record<string, string> = {
  account: '账号',
  address: '地址',
  arrival_station: '终点站',
  category: '分类',
  category_type: '分类类型',
  class: '班级',
  course: '课程',
  customer: '客户',
  department: '部门',
  departure_station: '起点站',
  destination_station: '终点站',
  detail_address: '详细地址',
  end_station: '终点站',
  email: '邮箱',
  enrollment: '选课',
  id_no: '证件号',
  item: '明细',
  major: '专业',
  message: '消息',
  notification: '通知',
  order: '订单',
  order_item: '订单明细',
  order_no: '订单号',
  order_status: '订单状态',
  origin_station: '起点站',
  passenger: '乘车人',
  pay_status: '支付状态',
  payment: '支付',
  payment_no: '支付单号',
  payment_record: '支付记录',
  phone: '手机号',
  price: '价格',
  product: '商品',
  product_name: '商品名称',
  quantity: '数量',
  refund: '退款',
  sales_order: '订单',
  ship_status: '发货状态',
  shipment: '发货',
  shipment_record: '发货记录',
  station: '车站',
  start_station: '起点站',
  student: '学生',
  teacher: '教师',
  to_station: '终点站',
  train: '列车',
  train_run: '列车开行',
  total_amount: '总金额',
  unit_price: '单价',
  user: '用户',
  username: '用户名',
  warehouse: '仓库',
};

const TOKEN_LABELS: Record<string, string> = {
  account: '账号',
  address: '地址',
  amount: '金额',
  category: '分类',
  code: '编码',
  course: '课程',
  customer: '客户',
  date: '日期',
  detail: '明细',
  email: '邮箱',
  item: '明细',
  name: '名称',
  no: '单号',
  number: '编号',
  order: '订单',
  pay: '支付',
  payment: '支付',
  phone: '手机号',
  price: '价格',
  product: '商品',
  quantity: '数量',
  record: '记录',
  refund: '退款',
  sales: '',
  ship: '发货',
  shipment: '发货',
  status: '状态',
  total: '总',
  type: '类型',
  unit: '单',
  user: '用户',
};

const CJK_TEXT = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/u;
const TABLE_SUFFIX = /(信息表|数据表|记录表|明细表|基础表|主表|从表|字典表|配置表|关系表|关联表|表)$/u;
const CONCEPT_SUFFIX = /(编号|代码|编码|标识|ID|id|名称|名字|姓名|信息|资料|数据)+$/u;
const DESCRIPTOR_COLUMN_PATTERN = /(^name$|_name$|^title$|_title$|^label$|_label$|^code$|_code$|^no$|_no$|number$|_number$|phone|email)/i;
const IMPORTANT_COLUMN_PATTERN = /(status|state|type|amount|price|total|quantity|count|date|time|score|grade|level)/i;

export function buildGenericConceptualStyle(model: DiagramModel): ConceptualStyle {
  const relations = activeRelations(model);
  const tableById = new Map(model.tables.map((table) => [table.id, table]));
  const denseDiagram = model.tables.length > 6 || relations.length > 12;
  const visibleRelations = selectVisibleRelations(model.tables, relations);
  const tableLabels = Object.fromEntries(
    model.tables.map((table) => [table.id, tableLabel(table)])
  );
  const columnLabels = Object.fromEntries(
    model.tables
      .map((table) => [
        table.id,
        Object.fromEntries(
          selectEntityAttributes(table, denseDiagram).map((column) => [
            column.id,
            columnLabel(table, column),
          ])
        ),
      ] as const)
      .filter(([, labels]) => Object.keys(labels).length > 0)
  );
  const relationNames = Object.fromEntries(
    visibleRelations.map((relation) => [
      relation.id,
      relationLabel(relation, tableById),
    ])
  );

  return {
    tableLabels,
    columnLabels,
    relationNames,
    relationEdgeLabels: {},
    extraRelations: [],
    entityPositions: createEntityPositions(model.tables, relations),
    relationPositions: {},
    attributePositions: {},
    attributeAngles: createAttributeAngles(model.tables),
    showCardinalityLabels: !denseDiagram,
  };
}

function selectEntityAttributes(table: TableModel, denseDiagram: boolean): ColumnModel[] {
  const candidates = table.columns.filter(
    (column) => !column.isForeignKey && !isTechnicalColumn(column)
  );
  const conceptualCandidates = denseDiagram
    ? candidates.filter((column) => !column.isPrimaryKey)
    : candidates;
  const ranked = rankColumns(conceptualCandidates.length > 0 ? conceptualCandidates : candidates, denseDiagram);

  return ranked.slice(0, denseDiagram ? MAX_DENSE_ENTITY_ATTRIBUTES : MAX_ENTITY_ATTRIBUTES);
}

function rankColumns(columns: ColumnModel[], denseDiagram: boolean): ColumnModel[] {
  return [...columns].sort((left, right) => columnRank(left, denseDiagram) - columnRank(right, denseDiagram));
}

function columnRank(column: ColumnModel, denseDiagram: boolean): number {
  if (column.isPrimaryKey) {
    return denseDiagram ? 8 : 0;
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

function selectVisibleRelations(tables: TableModel[], relations: RelationModel[]): RelationModel[] {
  if (relations.length <= MAX_VISIBLE_DENSE_RELATIONS) {
    return relations;
  }

  const tableById = new Map(tables.map((table) => [table.id, table]));
  return [...relations]
    .sort((left, right) => relationScore(right, tableById) - relationScore(left, tableById))
    .slice(0, MAX_VISIBLE_DENSE_RELATIONS);
}

function relationScore(relation: RelationModel, tableById: Map<string, TableModel>): number {
  const source = tableById.get(relation.sourceTableId);
  const target = tableById.get(relation.targetTableId);
  const sourceGroup = classifyTable(source);
  const targetGroup = classifyTable(target);
  let score = 10;

  if (sourceGroup === 'process') score += 5;
  if (targetGroup === 'actor' || targetGroup === 'core') score += 3;
  if (sourceGroup === 'log') score -= 3;
  if (targetGroup === 'reference') score -= 4;
  if (relation.sourceColumnIds.some((columnId) => /status|type|category/i.test(columnId))) score -= 2;
  if (relation.source !== 'foreign-key') score -= 1;

  return score;
}

const SEMANTIC_GROUPS: SemanticGroup[] = ['actor', 'process', 'core', 'reference', 'other', 'log'];
const GROUP_X: Record<SemanticGroup, number> = {
  actor: 180,
  process: 560,
  core: 940,
  reference: 1320,
  log: 560,
  other: 940,
};
const GROUP_START_Y: Record<SemanticGroup, number> = {
  actor: 260,
  process: 260,
  core: 260,
  reference: 260,
  other: 260,
  log: 980,
};
const GROUP_GAP_Y = 240;
const MAX_PERMUTED_GROUP_SIZE = 5;

function createEntityPositions(
  tables: TableModel[],
  relations: RelationModel[]
): Record<string, Point> {
  const groups = new Map<SemanticGroup, TableModel[]>();

  tables.forEach((table) => {
    const group = classifyTable(table);
    groups.set(group, [...(groups.get(group) ?? []), table]);
  });

  const orders = new Map<SemanticGroup, TableModel[]>();
  const positions: Record<string, Point> = {};

  SEMANTIC_GROUPS.forEach((group) => {
    const groupTables = groups.get(group) ?? [];
    orders.set(group, groupTables);
    groupTables.forEach((table, index) => {
      positions[table.id] = positionInGroup(group, index);
    });
  });

  // 两轮优化：先放资源/核心实体，再排参与者的顺序。
  // 反过来优化会让参与者先占位，容易把连线推到其他实体的属性区里。
  const optimizationOrder = [...SEMANTIC_GROUPS].reverse();

  for (let pass = 0; pass < 2; pass++) {
    optimizationOrder.forEach((group) => {
      const current = orders.get(group) ?? [];
      if (current.length < 2) {
        return;
      }

      const optimized = minimizeColumnCrossings(current, relations, positions, group);
      if (optimized === current) {
        return;
      }

      orders.set(group, optimized);
      optimized.forEach((table, index) => {
        positions[table.id] = positionInGroup(group, index);
      });
    });
  }

  return positions;
}

function positionInGroup(group: SemanticGroup, index: number): Point {
  return {
    x: GROUP_X[group],
    y: GROUP_START_Y[group] + index * GROUP_GAP_Y,
  };
}

/**
 * 语义分区的列位置固定，只调整列内顺序。
 * 小分组直接枚举全排列，选连线交叉最少的一种；大分组保持原顺序。
 */
function minimizeColumnCrossings(
  tables: TableModel[],
  relations: RelationModel[],
  positions: Record<string, Point>,
  group: SemanticGroup
): TableModel[] {
  if (tables.length > MAX_PERMUTED_GROUP_SIZE) {
    return tables;
  }

  let bestOrder = tables;
  let bestScore = countRelationCrossings(relations, positions);

  for (const candidate of permutations(tables)) {
    const candidatePositions = { ...positions };
    candidate.forEach((table, index) => {
      candidatePositions[table.id] = positionInGroup(group, index);
    });

    const score = countRelationCrossings(relations, candidatePositions);
    if (score < bestScore) {
      bestOrder = candidate;
      bestScore = score;
    }
  }

  return bestOrder;
}

function countRelationCrossings(
  relations: RelationModel[],
  positions: Record<string, Point>
): number {
  const segments: Array<{ source: string; target: string; start: Point; end: Point }> = [];

  relations.forEach((relation) => {
    const start = positions[relation.sourceTableId];
    const end = positions[relation.targetTableId];
    if (start && end) {
      segments.push({
        source: relation.sourceTableId,
        target: relation.targetTableId,
        start,
        end,
      });
    }
  });

  let crossings = 0;

  for (let left = 0; left < segments.length; left++) {
    for (let right = left + 1; right < segments.length; right++) {
      const first = segments[left];
      const second = segments[right];
      const sharesEndpoint =
        first.source === second.source ||
        first.source === second.target ||
        first.target === second.source ||
        first.target === second.target;

      if (!sharesEndpoint && segmentsIntersect(first.start, first.end, second.start, second.end)) {
        crossings++;
      }
    }
  }

  return crossings;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const first = orientation(c, d, a);
  const second = orientation(c, d, b);
  const third = orientation(a, b, c);
  const fourth = orientation(a, b, d);

  return (
    ((first > 0 && second < 0) || (first < 0 && second > 0)) &&
    ((third > 0 && fourth < 0) || (third < 0 && fourth > 0))
  );
}

function orientation(origin: Point, a: Point, b: Point): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield items;
    return;
  }

  for (let index = 0; index < items.length; index++) {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const permutation of permutations(rest)) {
      yield [items[index], ...permutation];
    }
  }
}

function createAttributeAngles(tables: TableModel[]): Record<string, number[]> {
  const academicAngles = createAcademicAttributeAngles(tables);
  if (Object.keys(academicAngles).length > 0) {
    return academicAngles;
  }

  return {};
}

function createAcademicAttributeAngles(tables: TableModel[]): Record<string, number[]> {
  const roleByTable = new Map(
    tables.map((table) => [table.id, academicRole(table)] as const)
  );
  const roles = new Set(roleByTable.values());

  if (
    !roles.has('teacher') ||
    !roles.has('student') ||
    !roles.has('major') ||
    !roles.has('course')
  ) {
    return {};
  }

  const angles: Record<string, number[]> = {};
  roleByTable.forEach((role, tableId) => {
    if (role === 'teacher') {
      angles[tableId] = [-145, -35];
    }
    if (role === 'student') {
      angles[tableId] = [155, 35];
    }
    if (role === 'major') {
      angles[tableId] = [-90, 0, 125];
    }
    if (role === 'course') {
      angles[tableId] = [145, 35];
    }
  });

  return angles;
}

function academicRole(table: TableModel): 'teacher' | 'student' | 'major' | 'course' | '' {
  const tableTokens = tokens(table.name);

  if (hasAny(tableTokens, ['teacher', 'instructor', 'lecturer'])) {
    return 'teacher';
  }
  if (hasAny(tableTokens, ['student', 'learner', 'pupil'])) {
    return 'student';
  }
  if (hasAny(tableTokens, ['major', 'department', 'program'])) {
    return 'major';
  }
  if (hasAny(tableTokens, ['course', 'subject', 'class'])) {
    return 'course';
  }

  return '';
}

function relationLabel(
  relation: RelationModel,
  tableById: Map<string, TableModel>
): string {
  const source = tableById.get(relation.sourceTableId);
  const target = tableById.get(relation.targetTableId);
  const sourceName = source?.name.toLowerCase() ?? relation.sourceTableId.toLowerCase();
  const targetName = target?.name.toLowerCase() ?? relation.targetTableId.toLowerCase();
  const sourceTokens = tokens(sourceName);
  const targetTokens = tokens(targetName);
  const sourceColumn = relation.sourceColumnIds[0] ?? '';

  const academicVerb = academicRelationVerb(source, target);
  if (academicVerb) return academicVerb;

  if (hasAny(sourceTokens, ['payment', 'pay']) && hasAny(targetTokens, ['order'])) return '支付';
  if (hasAny(sourceTokens, ['refund', 'return']) && hasAny(targetTokens, ['order', 'ticket'])) return '退款';
  if (hasAny(sourceTokens, ['shipment', 'ship', 'delivery']) && hasAny(targetTokens, ['order', 'address'])) return '发货';
  if (hasAny(sourceTokens, ['item', 'detail', 'line']) && hasAny(targetTokens, ['order'])) return '包含';
  if (hasAny(sourceTokens, ['item', 'detail', 'line']) && hasAny(targetTokens, ['product', 'goods'])) return '购买';
  if (hasAny(targetTokens, ['category', 'type'])) return '分类';
  if (hasAny(sourceTokens, ['address']) && classifyTable(target) === 'actor') return '维护';
  if (hasAny(sourceTokens, ['order', 'booking', 'reservation']) && classifyTable(target) === 'actor') return '创建';
  if (classifyTable(source) === 'process' && classifyTable(target) === 'actor') return '创建';
  if (classifyTable(source) === 'log' && classifyTable(target) === 'actor') return '接收';

  const columnConcept = source?.columns
    .filter((column) => relation.sourceColumnIds.includes(column.id))
    .map((column) => cleanChineseConcept(column.comment))
    .find(Boolean);
  if (columnConcept) {
    return columnConcept;
  }

  const roleLabel = labelFromIdentifier(sourceColumn.replace(/_?id$/i, ''));
  return roleLabel || tableLabel(target) || humanizeIdentifier(relation.name);
}

const ACADEMIC_RELATION_VERBS: Record<string, string> = {
  'teacher:student': '教导',
  'student:teacher': '教导',
  'teacher:course': '教授',
  'course:teacher': '教授',
  'student:course': '选修',
  'course:student': '选修',
  'teacher:major': '任教',
  'major:teacher': '任教',
  'student:major': '属于',
  'major:student': '属于',
  'course:major': '开设',
  'major:course': '开设',
};

function academicRelationVerb(
  source: TableModel | undefined,
  target: TableModel | undefined
): string {
  if (!source || !target) {
    return '';
  }

  const sourceRole = academicRole(source);
  const targetRole = academicRole(target);
  if (!sourceRole || !targetRole) {
    return '';
  }

  return ACADEMIC_RELATION_VERBS[`${sourceRole}:${targetRole}`] ?? '';
}

function classifyTable(table: TableModel | undefined): SemanticGroup {
  if (!table) {
    return 'other';
  }

  const value = table.name.toLowerCase();
  const tableTokens = tokens(value);

  if (hasAny(tableTokens, ['customer', 'user', 'account', 'passenger', 'student', 'teacher', 'employee', 'member'])) {
    return 'actor';
  }

  if (hasAny(tableTokens, ['order', 'ticket', 'payment', 'pay', 'refund', 'change', 'enrollment', 'shipment', 'delivery', 'booking', 'reservation', 'invoice', 'transaction'])) {
    return 'process';
  }

  if (hasAny(tableTokens, ['category', 'type', 'status', 'state', 'dictionary', 'dict', 'config', 'setting'])) {
    return 'reference';
  }

  if (hasAny(tableTokens, ['log', 'history', 'audit', 'message', 'notification', 'record'])) {
    return 'log';
  }

  if (hasAny(tableTokens, ['product', 'goods', 'course', 'train', 'station', 'seat', 'project', 'resource', 'address', 'warehouse', 'major'])) {
    return 'core';
  }

  return 'other';
}

function tableLabel(table: TableModel | undefined): string {
  if (!table) {
    return '';
  }

  return cleanChineseTableLabel(table.displayName) || cleanChineseTableLabel(table.comment) || labelFromIdentifier(table.name) || humanizeIdentifier(table.name);
}

function columnLabel(table: TableModel, column: ColumnModel): string {
  return cleanColumnComment(column.comment) || labelFromIdentifier(column.name) || scopedColumnLabel(table, column) || humanizeIdentifier(column.name);
}

function scopedColumnLabel(table: TableModel, column: ColumnModel): string {
  const normalized = column.name.toLowerCase();
  if (normalized.endsWith('_name')) {
    return `${tableLabel(table)}名称`;
  }
  return '';
}

function labelFromIdentifier(identifier: string): string {
  const normalized = identifier.toLowerCase();
  if (EXACT_LABELS[normalized]) {
    return EXACT_LABELS[normalized];
  }

  const translated = tokens(normalized)
    .map((token) => TOKEN_LABELS[token] ?? '')
    .join('');

  return translated || '';
}

function humanizeIdentifier(identifier: string): string {
  return tokens(identifier)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function tokens(identifier: string): string[] {
  return identifier
    .replace(/^t_/, '')
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean);
}

function hasAny(values: string[], candidates: string[]): boolean {
  return candidates.some((candidate) => values.includes(candidate));
}

function cleanChineseTableLabel(value: string | undefined): string {
  if (!value || !CJK_TEXT.test(value)) {
    return '';
  }

  return value.trim().replace(TABLE_SUFFIX, '').trim();
}

function cleanColumnComment(value: string | undefined): string {
  if (!value || !CJK_TEXT.test(value)) {
    return '';
  }

  return value.trim();
}

function cleanChineseConcept(value: string | undefined): string {
  if (!value || !CJK_TEXT.test(value)) {
    return '';
  }

  return value.trim().replace(CONCEPT_SUFFIX, '').trim();
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
