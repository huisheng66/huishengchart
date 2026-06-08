import { ErModel, RelationModel } from '../domain/er-model';

export function exportMermaidEr(model: ErModel): string {
  const lines = ['erDiagram'];

  for (const table of model.tables) {
    lines.push(`  ${table.name} {`);
    for (const column of table.columns) {
      const markers = [
        column.isPrimaryKey ? 'PK' : '',
        column.isForeignKey ? 'FK' : '',
        column.isUnique ? 'UK' : '',
      ]
        .filter(Boolean)
        .join(' ');
      lines.push(`    ${sanitizeType(column.dataType)} ${column.name}${markers ? ` ${markers}` : ''}`);
    }
    lines.push('  }');
  }

  for (const relation of [...model.relations, ...model.inferredRelations]) {
    lines.push(`  ${relation.sourceTableId} ${mermaidCardinality(relation)} ${relation.targetTableId} : "${relation.name}"`);
  }

  return lines.join('\n');
}

function mermaidCardinality(relation: RelationModel): string {
  switch (relation.cardinality) {
    case 'one-to-one':
      return '||--||';
    case 'one-to-many':
      return '||--o{';
    case 'many-to-many':
      return '}o--o{';
    case 'many-to-one':
    default:
      return '}o--||';
  }
}

function sanitizeType(dataType: string): string {
  return dataType.replace(/\s+/g, '_').replace(/[^\w()[\]]/g, '_');
}
