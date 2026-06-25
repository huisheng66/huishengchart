import {
  tableDisplayLabel,
  columnDisplayLabel,
  relationshipDisplayLabel,
  cardinalityEdgeLabel,
  oneOrManyLabel,
} from './display-labels';
import type { ColumnModel, RelationModel, TableModel } from './er-model';

function table(overrides: Partial<TableModel> = {}): TableModel {
  return {
    id: 'student',
    name: 'student',
    columns: [],
    primaryKey: [],
    uniqueKeys: [],
    ...overrides,
  };
}

function column(overrides: Partial<ColumnModel> = {}): ColumnModel {
  return {
    id: 'name',
    name: 'name',
    dataType: 'VARCHAR(50)',
    nullable: true,
    isPrimaryKey: false,
    isForeignKey: false,
    isUnique: false,
    ...overrides,
  };
}

function relation(overrides: Partial<RelationModel> = {}): RelationModel {
  return {
    id: 'student:major_id->major:id',
    name: 'fk_student_major',
    sourceTableId: 'student',
    sourceColumnIds: ['major_id'],
    targetTableId: 'major',
    targetColumnIds: ['id'],
    cardinality: 'many-to-one',
    source: 'foreign-key',
    ...overrides,
  };
}

describe('tableDisplayLabel', () => {
  it('uses comment as primary label when available', () => {
    const result = tableDisplayLabel(table({ comment: '学生表' }));
    expect(result).toEqual({ primary: '学生表', secondary: 'student' });
  });

  it('uses displayName when different from name', () => {
    const result = tableDisplayLabel(table({ name: 't_student', displayName: '学生表' }));
    expect(result).toEqual({ primary: '学生表', secondary: 't_student' });
  });

  it('falls back to name when no readable label exists', () => {
    const result = tableDisplayLabel(table({ name: 'student' }));
    expect(result).toEqual({ primary: 'student' });
  });

  it('prefers displayName over comment when both exist', () => {
    const result = tableDisplayLabel(
      table({ name: 't_student', displayName: '学生表', comment: '学生信息表' })
    );
    expect(result).toEqual({ primary: '学生表', secondary: 't_student' });
  });
});

describe('columnDisplayLabel', () => {
  it('uses comment as primary label', () => {
    const result = columnDisplayLabel(column({ name: 'major_id', comment: '专业编号' }));
    expect(result).toEqual({ primary: '专业编号', secondary: 'major_id' });
  });

  it('uses name only when no comment', () => {
    const result = columnDisplayLabel(column({ name: 'major_id' }));
    expect(result).toEqual({ primary: 'major_id' });
  });
});

describe('relationshipDisplayLabel', () => {
  it('returns Chinese name as-is', () => {
    expect(relationshipDisplayLabel(relation({ name: '选课' }))).toBe('选课');
  });

  it('converts cardinality to Chinese phrase for non-Chinese names', () => {
    expect(relationshipDisplayLabel(relation({ name: 'fk_student_major', cardinality: 'one-to-many' }))).toBe('一对多关系');
  });
});

describe('cardinalityEdgeLabel', () => {
  it('formats one-to-many with Chinese and notation', () => {
    expect(cardinalityEdgeLabel('one-to-many')).toBe('一对多 (1:N)');
  });

  it('formats many-to-many with Chinese and notation', () => {
    expect(cardinalityEdgeLabel('many-to-many')).toBe('多对多 (N:N)');
  });
});

describe('oneOrManyLabel', () => {
  it('returns 一 when not many', () => {
    expect(oneOrManyLabel(false)).toBe('一');
  });

  it('returns 多 when many', () => {
    expect(oneOrManyLabel(true)).toBe('多');
  });
});
