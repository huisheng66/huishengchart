import { activeRelations, type ErModel } from '../domain/er-model';

export type DeepSeekSchemaAnalysis = {
  tableLabels: Record<string, string>;
  relationLabels: Record<string, string>;
  primaryRelationIds: string[];
};

export type DeepSeekSchemaAnalysisOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

type DeepSeekMessage = {
  role: 'system' | 'user';
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';

export async function analyzeSchemaWithDeepSeek(
  model: ErModel,
  options: DeepSeekSchemaAnalysisOptions
): Promise<DeepSeekSchemaAnalysis> {
  const fetcher = options.fetchImpl ?? fetch;
  const response = await fetcher(`${options.baseUrl ?? DEFAULT_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      messages: buildSchemaAnalysisMessages(model),
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek schema analysis failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as DeepSeekResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek schema analysis returned an empty response.');
  }

  return parseDeepSeekSchemaAnalysis(content, model);
}

export function buildSchemaAnalysisMessages(model: ErModel): DeepSeekMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是数据库 ER 图语义分析器。只返回 JSON，不要返回 Markdown。不要创造 SQL 中不存在的表、字段或关系。',
    },
    {
      role: 'user',
      content: [
        '请分析以下已解析的 MySQL ER 模型，给出适合课程陈氏 ER 图的主体标签和关系动词。',
        '返回 JSON 格式：',
        '{"tables":[{"tableId":"表ID","label":"中文主体名","group":"actor|process|core|reference|log|other"}],"relations":[{"relationId":"关系ID","label":"中文关系动词","importance":"primary|secondary"}]}',
        '只允许使用下方 schema 中存在的 tableId 和 relationId。',
        JSON.stringify(schemaPayload(model), null, 2),
      ].join('\n'),
    },
  ];
}

export function parseDeepSeekSchemaAnalysis(rawContent: string, model: ErModel): DeepSeekSchemaAnalysis {
  const parsed = JSON.parse(rawContent) as {
    tables?: Array<{ tableId?: string; label?: string }>;
    relations?: Array<{ relationId?: string; label?: string; importance?: string }>;
  };
  const validTableIds = new Set(model.tables.map((table) => table.id));
  const validRelationIds = new Set(activeRelations(model).map((relation) => relation.id));
  const tableLabels: Record<string, string> = {};
  const relationLabels: Record<string, string> = {};
  const primaryRelationIds: string[] = [];

  for (const table of parsed.tables ?? []) {
    if (!table.tableId || !table.label || !validTableIds.has(table.tableId)) {
      continue;
    }
    tableLabels[table.tableId] = table.label.trim();
  }

  for (const relation of parsed.relations ?? []) {
    if (!relation.relationId || !relation.label || !validRelationIds.has(relation.relationId)) {
      continue;
    }
    relationLabels[relation.relationId] = relation.label.trim();
    if (relation.importance === 'primary') {
      primaryRelationIds.push(relation.relationId);
    }
  }

  return { tableLabels, relationLabels, primaryRelationIds };
}

function schemaPayload(model: ErModel) {
  return {
    tables: model.tables.map((table) => ({
      tableId: table.id,
      name: table.name,
      comment: table.comment,
      columns: table.columns.map((column) => ({
        columnId: column.id,
        name: column.name,
        comment: column.comment,
        isPrimaryKey: column.isPrimaryKey,
        isForeignKey: column.isForeignKey,
      })),
    })),
    relations: activeRelations(model).map((relation) => ({
      relationId: relation.id,
      sourceTableId: relation.sourceTableId,
      sourceColumnIds: relation.sourceColumnIds,
      targetTableId: relation.targetTableId,
      targetColumnIds: relation.targetColumnIds,
      source: relation.source,
    })),
  };
}
