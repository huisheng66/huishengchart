import { parseMySqlToErModel } from '../sql/mysql-parser';
import { toChenFlow } from './chen-adapter';
import { toCrowFootFlow } from './crow-foot-adapter';

const sql = `CREATE TABLE \`major\` (
  \`id\` BIGINT NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`teacher\` (
  \`id\` BIGINT NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`student\` (
  \`id\` BIGINT NOT NULL,
  \`major_id\` BIGINT NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_student_major\` FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
);

CREATE TABLE \`course\` (
  \`id\` BIGINT NOT NULL,
  \`teacher_id\` BIGINT,
  PRIMARY KEY (\`id\`)
);`;

it('adapts the model to Crow Foot table nodes and bound relationship edges', () => {
  const graph = toCrowFootFlow(parseMySqlToErModel(sql));

  expect(graph.nodes.filter((node) => node.type === 'table')).toHaveLength(4);
  expect(graph.nodes.find((node) => node.id === 'student')).toMatchObject({
    type: 'table',
    data: { table: expect.objectContaining({ name: 'student' }) },
  });
  expect(graph.edges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'student:major_id->major:id',
        type: 'relationship',
        source: 'student',
        target: 'major',
        data: expect.objectContaining({ label: 'N:1', inferred: false }),
      }),
      expect.objectContaining({
        id: 'course:teacher_id->teacher:id',
        source: 'course',
        target: 'teacher',
        data: expect.objectContaining({ inferred: true }),
      }),
    ])
  );
});

it('adapts the model to Chen ER entity, attribute, and relationship nodes', () => {
  const graph = toChenFlow(parseMySqlToErModel(sql));

  expect(graph.nodes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'entity:student', type: 'chenEntity' }),
      expect.objectContaining({ id: 'attribute:student:id', type: 'chenAttribute' }),
      expect.objectContaining({ id: 'relationship:student:major_id->major:id', type: 'chenRelationship' }),
    ])
  );
  expect(graph.edges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ source: 'entity:student', target: 'attribute:student:id' }),
      expect.objectContaining({
        source: 'relationship:student:major_id->major:id',
        target: 'entity:major',
        data: expect.objectContaining({ label: '1' }),
      }),
      expect.objectContaining({
        source: 'entity:student',
        target: 'relationship:student:major_id->major:id',
        data: expect.objectContaining({ label: 'N' }),
      }),
    ])
  );
});
