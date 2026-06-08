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
