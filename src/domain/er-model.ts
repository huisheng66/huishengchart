export type DiagramView = 'crowFoot' | 'chen';

export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export type RelationSource = 'foreign-key' | 'rule-inferred' | 'ai-inferred';

export type InferenceStatus = 'pending' | 'accepted' | 'rejected';

export type ColumnModel = {
  id: string;
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
};

export type TableModel = {
  id: string;
  name: string;
  displayName?: string;
  comment?: string;
  columns: ColumnModel[];
  primaryKey: string[];
  uniqueKeys: string[][];
};

export type RelationModel = {
  id: string;
  name: string;
  sourceTableId: string;
  sourceColumnIds: string[];
  targetTableId: string;
  targetColumnIds: string[];
  cardinality: Cardinality;
  source: RelationSource;
  confidence?: number;
  reason?: string;
  status?: InferenceStatus;
  onDelete?: 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'RESTRICT' | 'SET DEFAULT' | undefined;
  onUpdate?: 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'RESTRICT' | 'SET DEFAULT' | undefined;
};

export type DiagramNodeLayout = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type DiagramLayout = Record<string, DiagramNodeLayout>;

export type ErModel = {
  tables: TableModel[];
  relations: RelationModel[];
  inferredRelations: RelationModel[];
  layouts: Record<DiagramView, DiagramLayout>;
};

/** 图适配器真正需要的数据，不含 layouts，便于按内容缓存图构建结果。 */
export type DiagramModel = Pick<ErModel, 'tables' | 'relations' | 'inferredRelations'>;

export type RelationKeyInput = Pick<
  RelationModel,
  'sourceTableId' | 'sourceColumnIds' | 'targetTableId' | 'targetColumnIds'
>;

export function createEmptyErModel(): ErModel {
  return {
    tables: [],
    relations: [],
    inferredRelations: [],
    layouts: {
      crowFoot: {},
      chen: {},
    },
  };
}

export function relationKey(input: RelationKeyInput): string {
  return `${input.sourceTableId}:${input.sourceColumnIds.join(',')}->${input.targetTableId}:${input.targetColumnIds.join(',')}`;
}

/** 图中可见的关系：正式外键 + 未被拒绝的推断关系。 */
export function activeRelations(model: Pick<ErModel, 'relations' | 'inferredRelations'>): RelationModel[] {
  return [
    ...model.relations,
    ...model.inferredRelations.filter((relation) => relation.status !== 'rejected'),
  ];
}

/** 仍待用户确认的推断关系。 */
export function pendingInferredRelations(model: Pick<ErModel, 'relations' | 'inferredRelations'>): RelationModel[] {
  return model.inferredRelations.filter((relation) => relation.status === 'pending');
}
