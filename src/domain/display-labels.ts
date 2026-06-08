import type { Cardinality, ColumnModel, RelationModel, TableModel } from './er-model';

export type DisplayLabel = {
  primary: string;
  secondary?: string;
};

const CJK_TEXT = /[\u3400-\u9fff]/u;

export function tableDisplayLabel(table: TableModel): DisplayLabel {
  const readableName = table.displayName && table.displayName !== table.name ? table.displayName : table.comment;
  return readableFirstLabel(readableName, table.name);
}

export function columnDisplayLabel(column: ColumnModel): DisplayLabel {
  return readableFirstLabel(column.comment, column.name);
}

export function relationshipDisplayLabel(relation: RelationModel): string {
  if (CJK_TEXT.test(relation.name)) {
    return relation.name;
  }

  return `${cardinalityPhrase(relation.cardinality)}关系`;
}

export function cardinalityEdgeLabel(cardinality: Cardinality): string {
  return `${cardinalityPhrase(cardinality)} (${cardinalityNotation(cardinality)})`;
}

export function oneOrManyLabel(isMany: boolean): string {
  return isMany ? '多' : '一';
}

function readableFirstLabel(readableName: string | undefined, technicalName: string): DisplayLabel {
  const primary = readableName?.trim() || technicalName;

  return {
    primary,
    secondary: primary === technicalName ? undefined : technicalName,
  };
}

function cardinalityPhrase(cardinality: Cardinality): string {
  switch (cardinality) {
    case 'one-to-one':
      return '一对一';
    case 'one-to-many':
      return '一对多';
    case 'many-to-many':
      return '多对多';
    case 'many-to-one':
    default:
      return '多对一';
  }
}

function cardinalityNotation(cardinality: Cardinality): string {
  switch (cardinality) {
    case 'one-to-one':
      return '1:1';
    case 'one-to-many':
      return '1:N';
    case 'many-to-many':
      return 'N:N';
    case 'many-to-one':
    default:
      return 'N:1';
  }
}
