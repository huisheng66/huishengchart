import { createEmptyErModel, relationKey } from './er-model';

it('creates an empty ER model with separate layout buckets', () => {
  const model = createEmptyErModel();

  expect(model.tables).toEqual([]);
  expect(model.relations).toEqual([]);
  expect(model.inferredRelations).toEqual([]);
  expect(model.layouts).toEqual({ crowFoot: {}, chen: {} });
});

it('creates a stable relation key from source and target columns', () => {
  expect(
    relationKey({
      sourceTableId: 'student',
      sourceColumnIds: ['major_id'],
      targetTableId: 'major',
      targetColumnIds: ['id'],
    })
  ).toBe('student:major_id->major:id');
});
