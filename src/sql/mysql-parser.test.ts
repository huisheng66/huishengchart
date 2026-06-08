import { parseMySqlToErModel } from './mysql-parser';

const sql = `CREATE TABLE \`major\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '专业编号',
  \`name\` VARCHAR(80) NOT NULL COMMENT '专业名称',
  \`college\` VARCHAR(80) COMMENT '所属学院',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_major_name\` (\`name\`)
) ENGINE=InnoDB COMMENT='专业表';

CREATE TABLE \`student\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '学生编号',
  \`name\` VARCHAR(50) NOT NULL COMMENT '学生姓名',
  \`major_id\` BIGINT NOT NULL COMMENT '专业编号',
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_student_major\` FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
) ENGINE=InnoDB COMMENT='学生表';`;

it('parses MySQL tables, columns, keys, comments, and foreign keys', () => {
  const model = parseMySqlToErModel(sql);

  expect(model.tables).toHaveLength(2);
  const student = model.tables.find((table) => table.name === 'student');
  const major = model.tables.find((table) => table.name === 'major');

  expect(student?.comment).toBe('学生表');
  expect(student?.columns.find((column) => column.name === 'id')?.isPrimaryKey).toBe(true);
  expect(student?.columns.find((column) => column.name === 'major_id')?.isForeignKey).toBe(true);
  expect(major?.columns.find((column) => column.name === 'name')?.comment).toBe('专业名称');
  expect(major?.uniqueKeys).toEqual([['name']]);

  expect(model.relations).toHaveLength(1);
  expect(model.relations[0]).toMatchObject({
    id: 'student:major_id->major:id',
    name: 'fk_student_major',
    sourceTableId: student?.id,
    targetTableId: major?.id,
    sourceColumnIds: ['major_id'],
    targetColumnIds: ['id'],
    cardinality: 'many-to-one',
    source: 'foreign-key',
  });
});

it('resolves foreign keys when the referenced table appears later', () => {
  const reversedSql = `CREATE TABLE \`student\` (
    \`id\` BIGINT NOT NULL,
    \`major_id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_student_major\` FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
  );

  CREATE TABLE \`major\` (
    \`id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`)
  );`;

  const model = parseMySqlToErModel(reversedSql);

  expect(model.tables.map((table) => table.name)).toEqual(['student', 'major']);
  expect(model.relations).toHaveLength(1);
  expect(model.relations[0].targetTableId).toBe('major');
});

it('creates pending inferred relations for *_id columns without foreign keys', () => {
  const model = parseMySqlToErModel(`${sql}

  CREATE TABLE \`course\` (
    \`id\` BIGINT NOT NULL,
    \`teacher_id\` BIGINT,
    PRIMARY KEY (\`id\`)
  );`);

  expect(model.inferredRelations).toEqual([
    expect.objectContaining({
      id: 'course:teacher_id->teacher:id',
      source: 'rule-inferred',
      status: 'pending',
      sourceTableId: 'course',
      sourceColumnIds: ['teacher_id'],
      targetTableId: 'teacher',
      targetColumnIds: ['id'],
      confidence: 0.45,
    }),
  ]);
});

it('does not infer duplicate relations for declared foreign keys', () => {
  const model = parseMySqlToErModel(sql);

  expect(model.inferredRelations).toEqual([]);
});
