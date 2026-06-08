import {
  ColumnModel,
  ErModel,
  RelationModel,
  TableModel,
  createEmptyErModel,
  relationKey,
} from '../domain/er-model';

type CreateTableBlock = {
  tableName: string;
  body: string;
  tail: string;
};

type PendingForeignKey = {
  name: string;
  sourceTableName: string;
  sourceColumnNames: string[];
  targetTableName: string;
  targetColumnNames: string[];
};

export function parseMySqlToErModel(sql: string): ErModel {
  const model = createEmptyErModel();
  const blocks = extractCreateTableBlocks(sql);
  const pendingForeignKeys: PendingForeignKey[] = [];
  const tableNames = new Set<string>();

  for (const block of blocks) {
    const table = parseTableBlock(block, pendingForeignKeys);
    model.tables.push(table);
    tableNames.add(table.name);
  }

  pendingForeignKeys.push(...extractAlterTableForeignKeys(sql));

  const declaredRelationKeys = new Set<string>();

  for (const foreignKey of pendingForeignKeys) {
    const relation = createForeignKeyRelation(foreignKey, tableNames);
    if (!relation) {
      continue;
    }

    declaredRelationKeys.add(relation.id);
    model.relations.push(relation);
    markForeignKeyColumns(model, relation);
  }

  model.inferredRelations = inferRelations(model, declaredRelationKeys);

  return model;
}

function extractCreateTableBlocks(sql: string): CreateTableBlock[] {
  const blocks: CreateTableBlock[] = [];
  const createTablePattern =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:`[^`]+`|[a-zA-Z_][\w$]*)(?:\s*\.\s*(?:`[^`]+`|[a-zA-Z_][\w$]*))?)\s*\(/gi;

  let match: RegExpExecArray | null;
  while ((match = createTablePattern.exec(sql)) !== null) {
    const openParenIndex = createTablePattern.lastIndex - 1;
    const closeParenIndex = findMatchingParen(sql, openParenIndex);
    if (closeParenIndex < 0) {
      throw new Error(`Cannot find closing parenthesis for CREATE TABLE ${match[1]}`);
    }

    const semicolonIndex = findStatementEnd(sql, closeParenIndex + 1);
    const tableName = normalizeIdentifier(match[1]);
    const body = sql.slice(openParenIndex + 1, closeParenIndex);
    const tail = sql.slice(closeParenIndex + 1, semicolonIndex);

    blocks.push({ tableName, body, tail });
    createTablePattern.lastIndex = semicolonIndex + 1;
  }

  if (blocks.length === 0 && sql.trim()) {
    throw new Error('No CREATE TABLE statements found.');
  }

  return blocks;
}

function parseTableBlock(block: CreateTableBlock, pendingForeignKeys: PendingForeignKey[]): TableModel {
  const definitions = splitTopLevel(block.body, ',');
  const table: TableModel = {
    id: block.tableName,
    name: block.tableName,
    comment: extractTableComment(block.tail),
    columns: [],
    primaryKey: [],
    uniqueKeys: [],
  };

  for (const definition of definitions) {
    if (isColumnDefinition(definition)) {
      const column = parseColumnDefinition(definition);
      table.columns.push(column);
      if (column.isPrimaryKey) {
        table.primaryKey.push(column.id);
      }
      if (column.isUnique) {
        table.uniqueKeys.push([column.id]);
      }
    }
  }

  for (const definition of definitions) {
    parseTableConstraint(definition, table, pendingForeignKeys);
  }

  for (const column of table.columns) {
    column.isPrimaryKey = table.primaryKey.includes(column.id);
    column.isUnique = column.isUnique || table.uniqueKeys.some((key) => key.includes(column.id));
    if (column.isPrimaryKey) {
      column.nullable = false;
    }
  }

  return table;
}

function parseColumnDefinition(definition: string): ColumnModel {
  const match = definition.trim().match(/^(`[^`]+`|[a-zA-Z_][\w$]*)\s+(.+)$/is);
  if (!match) {
    throw new Error(`Invalid column definition: ${definition}`);
  }

  const name = normalizeIdentifier(match[1]);
  const rest = match[2].trim();
  const column: ColumnModel = {
    id: name,
    name,
    dataType: extractDataType(rest),
    nullable: !/\bnot\s+null\b/i.test(rest),
    defaultValue: extractDefaultValue(rest),
    comment: extractComment(rest),
    isPrimaryKey: /\bprimary\s+key\b/i.test(rest),
    isForeignKey: /\breferences\b/i.test(rest),
    isUnique: /\bunique\b/i.test(rest),
  };

  return column;
}

function parseTableConstraint(
  definition: string,
  table: TableModel,
  pendingForeignKeys: PendingForeignKey[]
): void {
  const normalized = definition.trim();
  const lower = normalized.toLowerCase();

  if (lower.startsWith('primary key')) {
    table.primaryKey = extractColumnList(normalized);
    return;
  }

  if (/^(unique|unique\s+key|unique\s+index|constraint\s+`?[^`\s]+`?\s+unique)/i.test(normalized)) {
    const keyColumns = extractColumnList(normalized);
    if (keyColumns.length > 0) {
      table.uniqueKeys.push(keyColumns);
    }
    return;
  }

  const foreignKey = parseForeignKeyConstraint(normalized, table.name);
  if (foreignKey) {
    pendingForeignKeys.push(foreignKey);
  }
}

function parseForeignKeyConstraint(definition: string, sourceTableName: string): PendingForeignKey | null {
  const match = definition.match(
    /^(?:constraint\s+(`[^`]+`|[a-zA-Z_][\w$]*)\s+)?foreign\s+key\s*\(([^)]+)\)\s+references\s+((?:`[^`]+`|[a-zA-Z_][\w$]*)(?:\s*\.\s*(?:`[^`]+`|[a-zA-Z_][\w$]*))?)\s*\(([^)]+)\)/i
  );

  if (!match) {
    return null;
  }

  return {
    name: match[1] ? normalizeIdentifier(match[1]) : `fk_${sourceTableName}_${normalizeIdentifier(match[3])}`,
    sourceTableName,
    sourceColumnNames: parseIdentifierList(match[2]),
    targetTableName: normalizeIdentifier(match[3]),
    targetColumnNames: parseIdentifierList(match[4]),
  };
}

function extractAlterTableForeignKeys(sql: string): PendingForeignKey[] {
  const foreignKeys: PendingForeignKey[] = [];
  const alterTablePattern =
    /alter\s+table\s+((?:`[^`]+`|[a-zA-Z_][\w$]*)(?:\s*\.\s*(?:`[^`]+`|[a-zA-Z_][\w$]*))?)\s+([\s\S]*?);/gi;

  let match: RegExpExecArray | null;
  while ((match = alterTablePattern.exec(sql)) !== null) {
    const sourceTableName = normalizeIdentifier(match[1]);
    const actions = splitTopLevel(match[2], ',');

    for (const action of actions) {
      const normalized = action.replace(/^add\s+/i, '').trim();
      const foreignKey = parseForeignKeyConstraint(normalized, sourceTableName);
      if (foreignKey) {
        foreignKeys.push(foreignKey);
      }
    }
  }

  return foreignKeys;
}

function createForeignKeyRelation(
  foreignKey: PendingForeignKey,
  tableNames: Set<string>
): RelationModel | null {
  if (!tableNames.has(foreignKey.sourceTableName) || !tableNames.has(foreignKey.targetTableName)) {
    return null;
  }

  const relationInput = {
    sourceTableId: foreignKey.sourceTableName,
    sourceColumnIds: foreignKey.sourceColumnNames,
    targetTableId: foreignKey.targetTableName,
    targetColumnIds: foreignKey.targetColumnNames,
  };

  return {
    id: relationKey(relationInput),
    name: foreignKey.name,
    ...relationInput,
    cardinality: 'many-to-one',
    source: 'foreign-key',
  };
}

function markForeignKeyColumns(model: ErModel, relation: RelationModel): void {
  const sourceTable = model.tables.find((table) => table.id === relation.sourceTableId);
  for (const column of sourceTable?.columns ?? []) {
    if (relation.sourceColumnIds.includes(column.id)) {
      column.isForeignKey = true;
    }
  }
}

function inferRelations(model: ErModel, declaredRelationKeys: Set<string>): RelationModel[] {
  const inferredRelations: RelationModel[] = [];

  for (const table of model.tables) {
    for (const column of table.columns) {
      if (column.isForeignKey || column.isPrimaryKey || !column.name.endsWith('_id')) {
        continue;
      }

      const targetTableId = column.name.slice(0, -3);
      const relationInput = {
        sourceTableId: table.id,
        sourceColumnIds: [column.id],
        targetTableId,
        targetColumnIds: ['id'],
      };
      const key = relationKey(relationInput);

      if (declaredRelationKeys.has(key)) {
        continue;
      }

      inferredRelations.push({
        id: key,
        name: `inferred_${table.name}_${column.name}`,
        ...relationInput,
        cardinality: 'many-to-one',
        source: 'rule-inferred',
        confidence: model.tables.some((candidate) => candidate.id === targetTableId) ? 0.7 : 0.45,
        reason: `Column ${table.name}.${column.name} looks like a foreign key.`,
        status: 'pending',
      });
    }
  }

  return inferredRelations;
}

function isColumnDefinition(definition: string): boolean {
  const trimmed = definition.trim();
  if (!/^(`[^`]+`|[a-zA-Z_][\w$]*)\s+/i.test(trimmed)) {
    return false;
  }

  return !/^(primary|unique|key|index|constraint|foreign|check)\b/i.test(trimmed);
}

function extractDataType(rest: string): string {
  const keywordIndex = findFirstKeywordIndex(rest, [
    'not null',
    'null',
    'default',
    'comment',
    'auto_increment',
    'primary key',
    'unique',
    'references',
    'collate',
    'character set',
  ]);

  return rest.slice(0, keywordIndex < 0 ? rest.length : keywordIndex).trim();
}

function extractDefaultValue(rest: string): string | undefined {
  const match = rest.match(/\bdefault\s+((?:'[^']*')|(?:"[^"]*")|[^\s,]+)/i);
  return match?.[1]?.replace(/^['"]|['"]$/g, '');
}

function extractTableComment(tail: string): string | undefined {
  return extractComment(tail);
}

function extractComment(input: string): string | undefined {
  const match = input.match(/\bcomment\s*=\s*'([^']*)'|\bcomment\s+'([^']*)'/i);
  return match?.[1] ?? match?.[2];
}

function extractColumnList(definition: string): string[] {
  const openParenIndex = definition.indexOf('(');
  if (openParenIndex < 0) {
    return [];
  }

  const closeParenIndex = findMatchingParen(definition, openParenIndex);
  if (closeParenIndex < 0) {
    return [];
  }

  return parseIdentifierList(definition.slice(openParenIndex + 1, closeParenIndex));
}

function parseIdentifierList(input: string): string[] {
  return splitTopLevel(input, ',')
    .map((column) => normalizeIdentifier(column.replace(/\s+(asc|desc)\b/gi, '').trim()))
    .filter(Boolean);
}

function normalizeIdentifier(input: string): string {
  const parts = input
    .trim()
    .split('.')
    .map((part) => part.trim().replace(/^`|`$/g, ''));

  return parts[parts.length - 1] ?? '';
}

function findFirstKeywordIndex(input: string, keywords: string[]): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
    if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
    if (inSingleQuote || inDoubleQuote) continue;
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (parenDepth !== 0) continue;

    const slice = input.slice(index).toLowerCase();
    if (keywords.some((keyword) => slice.match(new RegExp(`^${keyword.replace(' ', '\\s+')}(?:\\b|\\s)`)))) {
      return index;
    }
  }

  return -1;
}

function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    const previousChar = input[index - 1];

    if (char === "'" && !inDoubleQuote && previousChar !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && previousChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === separator && parenDepth === 0) {
        parts.push(input.slice(start, index).trim());
        start = index + 1;
      }
    }
  }

  const finalPart = input.slice(start).trim();
  if (finalPart) {
    parts.push(finalPart);
  }

  return parts;
}

function findMatchingParen(input: string, openParenIndex: number): number {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = openParenIndex; index < input.length; index++) {
    const char = input[index];
    const previousChar = input[index - 1];

    if (char === "'" && !inDoubleQuote && previousChar !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && previousChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function findStatementEnd(input: string, startIndex: number): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = startIndex; index < input.length; index++) {
    const char = input[index];
    const previousChar = input[index - 1];

    if (char === "'" && !inDoubleQuote && previousChar !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && previousChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      return index;
    }
  }

  return input.length;
}
