import { parseMySqlToErModel } from '../sql/mysql-parser';
import type { RelationModel } from '../domain/er-model';
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
  \`name\` VARCHAR(50) NOT NULL,
  \`major_id\` BIGINT NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_student_major\` FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
);

CREATE TABLE \`course\` (
  \`id\` BIGINT NOT NULL,
  \`teacher_id\` BIGINT,
  PRIMARY KEY (\`id\`)
);`;

const enrollmentSql = `CREATE TABLE \`student\` (
  \`id\` BIGINT NOT NULL,
  \`name\` VARCHAR(50) NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`course\` (
  \`id\` BIGINT NOT NULL,
  \`title\` VARCHAR(100) NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`enrollment\` (
  \`student_id\` BIGINT NOT NULL,
  \`course_id\` BIGINT NOT NULL,
  \`grade\` DECIMAL(5, 2),
  \`enrolled_at\` DATETIME,
  PRIMARY KEY (\`student_id\`, \`course_id\`),
  CONSTRAINT \`fk_enrollment_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`student\`(\`id\`),
  CONSTRAINT \`fk_enrollment_course\` FOREIGN KEY (\`course_id\`) REFERENCES \`course\`(\`id\`)
);`;

const complexTableSql = `CREATE TABLE \`passenger\` (
  \`id\` BIGINT NOT NULL,
  \`name\` VARCHAR(50) NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`train_run\` (
  \`id\` BIGINT NOT NULL,
  \`train_no\` VARCHAR(20) NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`ticket\` (
  \`id\` BIGINT NOT NULL,
  \`ticket_no\` VARCHAR(40) NOT NULL,
  \`passenger_id\` BIGINT NOT NULL,
  \`train_run_id\` BIGINT NOT NULL,
  \`status\` VARCHAR(20) NOT NULL,
  \`price\` DECIMAL(10, 2) NOT NULL,
  \`created_at\` DATETIME,
  \`updated_at\` DATETIME,
  \`version\` INT,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_ticket_passenger\` FOREIGN KEY (\`passenger_id\`) REFERENCES \`passenger\`(\`id\`),
  CONSTRAINT \`fk_ticket_train_run\` FOREIGN KEY (\`train_run_id\`) REFERENCES \`train_run\`(\`id\`)
);`;

const commentedRelationSql = `CREATE TABLE \`major\` (
  \`id\` BIGINT NOT NULL COMMENT '专业编号',
  \`name\` VARCHAR(80) NOT NULL COMMENT '专业名称',
  PRIMARY KEY (\`id\`)
) COMMENT='专业表';

CREATE TABLE \`student\` (
  \`id\` BIGINT NOT NULL COMMENT '学生编号',
  \`major_id\` BIGINT NOT NULL COMMENT '专业编号',
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_student_major\` FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
) COMMENT='学生表';`;

const denseSchemaSql = `CREATE TABLE \`account\` (
  \`id\` BIGINT NOT NULL,
  \`username\` VARCHAR(50) NOT NULL,
  \`real_name\` VARCHAR(50),
  \`status\` VARCHAR(20),
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`station\` (
  \`id\` BIGINT NOT NULL,
  \`station_name\` VARCHAR(80) NOT NULL,
  \`station_code\` VARCHAR(20) NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`passenger\` (
  \`id\` BIGINT NOT NULL,
  \`account_id\` BIGINT NOT NULL,
  \`name\` VARCHAR(50) NOT NULL,
  \`id_no\` VARCHAR(30) NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_passenger_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`account\`(\`id\`)
);

CREATE TABLE \`train\` (
  \`id\` BIGINT NOT NULL,
  \`train_no\` VARCHAR(20) NOT NULL,
  \`origin_station_id\` BIGINT NOT NULL,
  \`destination_station_id\` BIGINT NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_train_origin_station\` FOREIGN KEY (\`origin_station_id\`) REFERENCES \`station\`(\`id\`),
  CONSTRAINT \`fk_train_destination_station\` FOREIGN KEY (\`destination_station_id\`) REFERENCES \`station\`(\`id\`)
);

CREATE TABLE \`train_run\` (
  \`id\` BIGINT NOT NULL,
  \`train_id\` BIGINT NOT NULL,
  \`run_date\` DATE NOT NULL,
  \`run_status\` VARCHAR(20) NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_train_run_train\` FOREIGN KEY (\`train_id\`) REFERENCES \`train\`(\`id\`)
);

CREATE TABLE \`ticket_order\` (
  \`id\` BIGINT NOT NULL,
  \`account_id\` BIGINT NOT NULL,
  \`order_no\` VARCHAR(40) NOT NULL,
  \`total_amount\` DECIMAL(10, 2),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_order_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`account\`(\`id\`)
);

CREATE TABLE \`ticket\` (
  \`id\` BIGINT NOT NULL,
  \`order_id\` BIGINT NOT NULL,
  \`passenger_id\` BIGINT NOT NULL,
  \`train_run_id\` BIGINT NOT NULL,
  \`ticket_no\` VARCHAR(40) NOT NULL,
  \`ticket_status\` VARCHAR(20),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_ticket_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`ticket_order\`(\`id\`),
  CONSTRAINT \`fk_ticket_passenger\` FOREIGN KEY (\`passenger_id\`) REFERENCES \`passenger\`(\`id\`),
  CONSTRAINT \`fk_ticket_train_run\` FOREIGN KEY (\`train_run_id\`) REFERENCES \`train_run\`(\`id\`)
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
      expect.objectContaining({ id: 'attribute:student:name', type: 'chenAttribute' }),
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
  expect(graph.nodes.find((node) => node.id === 'attribute:student:major_id')).toBeUndefined();
  expect(new Set(studentAttributes.map((node) => node.position.x)).size).toBeGreaterThan(1);
  expect(new Set(studentAttributes.map((node) => node.position.y)).size).toBeGreaterThan(1);
  expect(studentAttributes.every((node) => centerDistance(studentEntity, node) > 130)).toBe(true);
  expect(centerDistance(studentEntity, relationship)).toBeLessThan(centerDistance(studentEntity, majorEntity));
  expect(centerDistance(majorEntity, relationship)).toBeLessThan(centerDistance(studentEntity, majorEntity));
  expect(graph.edges.filter((edge) => edge.source === 'entity:student').every((edge) => edge.data?.edgeStyle === 'straight')).toBe(true);
});

it('promotes pure join tables to Chen relationship diamonds with relationship attributes', () => {
  const graph = toChenFlow(parseMySqlToErModel(enrollmentSql));

  expect(graph.nodes.find((node) => node.id === 'entity:enrollment')).toBeUndefined();
  expect(graph.nodes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'entity:student', type: 'chenEntity' }),
      expect.objectContaining({ id: 'entity:course', type: 'chenEntity' }),
      expect.objectContaining({ id: 'relationship:associative:enrollment', type: 'chenRelationship' }),
      expect.objectContaining({ id: 'attribute:enrollment:grade', type: 'chenAttribute' }),
    ])
  );
  expect(graph.nodes.find((node) => node.id === 'attribute:enrollment:student_id')).toBeUndefined();
  expect(graph.nodes.find((node) => node.id === 'attribute:enrollment:course_id')).toBeUndefined();
  expect(graph.edges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ source: 'entity:student', target: 'relationship:associative:enrollment' }),
      expect.objectContaining({ source: 'entity:course', target: 'relationship:associative:enrollment' }),
      expect.objectContaining({ source: 'relationship:associative:enrollment', target: 'attribute:enrollment:grade' }),
    ])
  );
});

it('keeps Chen entity attributes conceptual instead of listing every physical column', () => {
  const graph = toChenFlow(parseMySqlToErModel(complexTableSql));
  const ticketAttributes = graph.nodes.filter((node) => node.id.startsWith('attribute:ticket:'));

  expect(ticketAttributes.map((node) => node.id)).toEqual([
    'attribute:ticket:id',
    'attribute:ticket:ticket_no',
    'attribute:ticket:status',
    'attribute:ticket:price',
  ]);
  expect(graph.nodes.find((node) => node.id === 'attribute:ticket:passenger_id')).toBeUndefined();
  expect(graph.nodes.find((node) => node.id === 'attribute:ticket:train_run_id')).toBeUndefined();
  expect(graph.nodes.find((node) => node.id === 'attribute:ticket:created_at')).toBeUndefined();
});

it('uses Chinese column and table comments as Chen relationship concepts', () => {
  const graph = toChenFlow(parseMySqlToErModel(commentedRelationSql));
  const relationshipNames = graph.nodes
    .filter((node) => node.type === 'chenRelationship')
    .map((node) => (node.data as { relation?: RelationModel }).relation?.name ?? '');

  expect(relationshipNames).toContain('专业');
  expect(relationshipNames).not.toContain('fk_student_major');
});

it('uses compact conceptual attributes and role names for dense Chen diagrams', () => {
  const graph = toChenFlow(parseMySqlToErModel(denseSchemaSql));
  const passengerAttributes = graph.nodes.filter((node) => node.id.startsWith('attribute:passenger:'));
  const trainRelationshipNames = graph.nodes
    .filter((node) => node.type === 'chenRelationship')
    .map((node) => (node.data as { relation?: RelationModel }).relation?.name ?? '');

  expect(passengerAttributes.map((node) => node.id)).toEqual(['attribute:passenger:name', 'attribute:passenger:id_no']);
  expect(graph.nodes.find((node) => node.id === 'attribute:passenger:id')).toBeUndefined();
  expect(trainRelationshipNames).toEqual(expect.arrayContaining(['起点站', '终点站']));
  expect(trainRelationshipNames).not.toContain('fk_train_origin_station');
  expect(graph.edges.map((edge) => edge.data?.label ?? '').filter(Boolean)).toEqual([]);
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
