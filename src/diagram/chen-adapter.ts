import type { ColumnModel, ErModel, RelationModel, TableModel } from '../domain/er-model';
import { oneOrManyLabel } from '../domain/display-labels';
import type { ErEdge, ErNode, FlowGraph } from './react-flow-types';

const ENTITY_WIDTH = 170;
const ENTITY_HEIGHT = 64;
const ATTRIBUTE_WIDTH = 150;
const ATTRIBUTE_HEIGHT = 58;
const RELATIONSHIP_SIZE = 112;
const CLUSTER_WIDTH = 860;
const CLUSTER_HEIGHT = 600;
const ATTRIBUTE_RADIUS_X = 245;
const ATTRIBUTE_RADIUS_Y = 168;
const ATTRIBUTE_RADIUS_STEP_X = 28;
const ATTRIBUTE_RADIUS_STEP_Y = 20;
const NODE_CLEARANCE = 18;
const RELATIONSHIP_PARALLEL_GAP = 92;
const RELATIONSHIP_AVOID_GAP = 154;
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

const CJK_TEXT = /[\u3400-\u9fff]/u;
const DESCRIPTOR_COLUMN_PATTERN = /(^name$|_name$|^title$|_title$|^label$|_label$|^code$|_code$|^no$|_no$|number$|_number$)/i;
const IMPORTANT_COLUMN_PATTERN = /(status|state|type|amount|price|total|quantity|count|date|time|score|grade|level)/i;

type Point = {
  x: number;
  y: number;
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

export function toChenFlow(model: ErModel): FlowGraph {
  const nodes: ErNode[] = [];
  const edges: ErEdge[] = [];
  const placements = new Map<string, NodePlacement>();
  const relationList = [...model.relations, ...model.inferredRelations];
  const associativeRelationships = identifyAssociativeRelationships(model.tables, relationList);
  const associativeTableIds = new Set([...associativeRelationships.keys()]);
  const entityTables = model.tables.filter((table) => !associativeTableIds.has(table.id));
  const normalRelations = relationList.filter(
    (relation) => !associativeTableIds.has(relation.sourceTableId) && !associativeTableIds.has(relation.targetTableId)
  );
  const tableById = new Map(model.tables.map((table) => [table.id, table]));
  const conceptualRelations = normalRelations.map((relation) => toConceptualRelation(relation, tableById));
  const denseDiagram = entityTables.length > DENSE_ENTITY_THRESHOLD || normalRelations.length + associativeRelationships.size > DENSE_CARDINALITY_LABEL_THRESHOLD;
  const showCardinalityLabels = !denseDiagram;
  const entityColumns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(entityTables.length))));

  entityTables.forEach((table, tableIndex) => {
    addNode(toEntityNode(table, tableIndex, entityColumns), nodes, placements);
  });

  entityTables.forEach((table) => {
    const entityId = entityNodeId(table.id);
    const entityPlacement = placements.get(entityId);

    if (!entityPlacement) {
      return;
    }

    const conceptualColumns = selectEntityAttributes(table, denseDiagram);
    const attributePositions = placeAttributes(entityPlacement.center, conceptualColumns.length);

    conceptualColumns.forEach((column, columnIndex) => {
      const attributeId = attributeNodeId(table.id, column.id);
      addNode(
        {
          id: attributeId,
          type: 'chenAttribute',
          position: attributePositions[columnIndex],
          width: ATTRIBUTE_WIDTH,
          height: ATTRIBUTE_HEIGHT,
          data: { table, column },
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
    const relationshipCenter = placeRelationship(relation, relationCounts, usedRelationIndexes, placements);
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

    edges.push({
      ...createStraightEdge(
        `edge:${entityNodeId(relation.sourceTableId)}:${relationshipId}`,
        entityNodeId(relation.sourceTableId),
        relationshipId,
        {
          relation,
          label: showCardinalityLabels ? sourceCardinalityLabel(relation) : '',
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
          label: showCardinalityLabels ? targetCardinalityLabel(relation) : '',
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
            label: showCardinalityLabels ? oneOrManyLabel(true) : '',
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
          data: { table: associativeRelationship.table, column },
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

function selectEntityAttributes(table: TableModel, denseDiagram: boolean): ColumnModel[] {
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

function toConceptualRelation(relation: RelationModel, tableById: Map<string, TableModel>): RelationModel {
  return {
    ...relation,
    name: conceptualRelationName(relation, tableById),
  };
}

function conceptualRelationName(relation: RelationModel, tableById: Map<string, TableModel>): string {
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

function toEntityNode(table: TableModel, index: number, columnCount: number): ErNode {
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;
  const center = {
    x: column * CLUSTER_WIDTH + CLUSTER_WIDTH / 2,
    y: row * CLUSTER_HEIGHT + CLUSTER_HEIGHT / 2,
  };

  return {
    id: entityNodeId(table.id),
    type: 'chenEntity',
    position: centerToPosition(center, ENTITY_WIDTH, ENTITY_HEIGHT),
    width: ENTITY_WIDTH,
    height: ENTITY_HEIGHT,
    data: { table },
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

function placeAttributes(entityCenter: Point, attributeCount: number): Point[] {
  const angles = attributeAngles(attributeCount);
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

  return {
    id,
    type: 'relationship',
    source,
    target,
    sourceHandle: sourcePlacement && targetPlacement ? sideHandleId('source', sourcePlacement, targetPlacement) : undefined,
    targetHandle: sourcePlacement && targetPlacement ? sideHandleId('target', targetPlacement, sourcePlacement) : undefined,
    data: { ...data, edgeStyle: 'straight' },
  };
}

function sideHandleId(type: 'source' | 'target', from: NodePlacement, to: NodePlacement): string {
  const dx = to.center.x - from.center.x;
  const dy = to.center.y - from.center.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? `${type}:right` : `${type}:left`;
  }

  return dy >= 0 ? `${type}:bottom` : `${type}:top`;
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
