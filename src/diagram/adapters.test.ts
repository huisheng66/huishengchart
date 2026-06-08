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
        sourceHandle: 'source:major_id',
        target: 'major',
        targetHandle: 'target:id',
        data: expect.objectContaining({ label: '多对一 (N:1)', inferred: false }),
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
  const studentEntity = getNode(graph.nodes, 'entity:student');
  const majorEntity = getNode(graph.nodes, 'entity:major');
  const studentAttributes = graph.nodes.filter((node) => node.id.startsWith('attribute:student:'));
  const relationship = getNode(graph.nodes, 'relationship:student:major_id->major:id');

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
        data: expect.objectContaining({ label: '一' }),
      }),
      expect.objectContaining({
        source: 'entity:student',
        target: 'relationship:student:major_id->major:id',
        data: expect.objectContaining({ label: '多' }),
      }),
    ])
  );
  expect(graph.layoutStrategy).toBe('manual');
  expect(new Set(studentAttributes.map((node) => node.position.x)).size).toBeGreaterThan(1);
  expect(new Set(studentAttributes.map((node) => node.position.y)).size).toBeGreaterThan(1);
  expect(studentAttributes.every((node) => centerDistance(studentEntity, node) > 130)).toBe(true);
  expect(centerDistance(studentEntity, relationship)).toBeLessThan(centerDistance(studentEntity, majorEntity));
  expect(centerDistance(majorEntity, relationship)).toBeLessThan(centerDistance(studentEntity, majorEntity));
  expect(graph.edges.filter((edge) => edge.source === 'entity:student').every((edge) => edge.data?.edgeStyle === 'straight')).toBe(true);
});

function getNode(nodes: ReturnType<typeof toChenFlow>['nodes'], id: string) {
  const node = nodes.find((candidate) => candidate.id === id);
  expect(node).toBeDefined();
  return node!;
}

function centerDistance(left: ReturnType<typeof getNode>, right: ReturnType<typeof getNode>): number {
  const leftCenter = {
    x: left.position.x + (left.width ?? 0) / 2,
    y: left.position.y + (left.height ?? 0) / 2,
  };
  const rightCenter = {
    x: right.position.x + (right.width ?? 0) / 2,
    y: right.position.y + (right.height ?? 0) / 2,
  };

  return Math.hypot(leftCenter.x - rightCenter.x, leftCenter.y - rightCenter.y);
}
