import { ErModel, RelationModel } from '../domain/er-model';

export function exportDataDictionaryMarkdown(model: ErModel): string {
  const lines = ['# 数据字典'];

  for (const table of model.tables) {
    lines.push('', `## ${table.name}${table.comment ? ` ${table.comment}` : ''}`);
    lines.push('', '| 字段 | 类型 | 可为空 | 默认值 | 键 | 说明 |');
    lines.push('| --- | --- | --- | --- | --- | --- |');

    for (const column of table.columns) {
      lines.push(
        [
          '',
          column.name,
          column.dataType,
          column.nullable ? '是' : '否',
          column.defaultValue ?? '',
          keyMarkers(column),
          column.comment ?? '',
          '',
        ].join(' | ')
      );
    }
  }

  return lines.join('\n');
}

export function exportRelationshipReportMarkdown(model: ErModel): string {
  const lines = ['# 关系说明', '', '## 明确外键关系'];
  const inferredRelations = model.inferredRelations.filter((relation) => relation.status !== 'rejected');

  if (model.relations.length === 0) {
    lines.push('', '无明确外键关系。');
  } else {
    for (const relation of model.relations) {
      lines.push('', formatRelation(relation));
    }
  }

  lines.push('', '## 待确认推断关系');
  if (inferredRelations.length === 0) {
    lines.push('', '无待确认推断关系。');
  } else {
    for (const relation of inferredRelations) {
      lines.push('', `${formatRelation(relation)}，置信度 ${Math.round((relation.confidence ?? 0) * 100)}%。`);
    }
  }

  return lines.join('\n');
}

function keyMarkers(column: { isPrimaryKey: boolean; isForeignKey: boolean; isUnique: boolean }): string {
  return [
    column.isPrimaryKey ? 'PK' : '',
    column.isForeignKey ? 'FK' : '',
    column.isUnique ? 'UK' : '',
  ]
    .filter(Boolean)
    .join('/');
}

function formatRelation(relation: RelationModel): string {
  const actions = [
    relation.onDelete ? `ON DELETE ${relation.onDelete}` : '',
    relation.onUpdate ? `ON UPDATE ${relation.onUpdate}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const actionSuffix = actions ? ` (${actions})` : '';
  return `- ${relation.sourceTableId}.${relation.sourceColumnIds.join(', ')} -> ${relation.targetTableId}.${relation.targetColumnIds.join(', ')} (${relation.name})${actionSuffix}`;
}
