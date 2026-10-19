import { parseMySqlToErModel } from '../sql/mysql-parser';
import { exportDataDictionaryMarkdown, exportRelationshipReportMarkdown } from './markdown';

const sql = `CREATE TABLE \`major\` (
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

it('exports a data dictionary with table and column comments', () => {
  const markdown = exportDataDictionaryMarkdown(parseMySqlToErModel(sql));

  expect(markdown).toContain('## student 学生表');
  expect(markdown).toContain('| major_id | BIGINT | 否 |  | FK | 专业编号 |');
});

it('exports a deterministic relationship report', () => {
  const markdown = exportRelationshipReportMarkdown(parseMySqlToErModel(sql));

  expect(markdown).toContain('## 明确外键关系');
  expect(markdown).toContain('student.major_id -> major.id');
  expect(markdown).toContain('fk_student_major');
});

it('omits rejected inferred relations from the relationship report', () => {
  const model = parseMySqlToErModel(`CREATE TABLE \`teacher\` (
    \`id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`)
  );

  CREATE TABLE \`course\` (
    \`id\` BIGINT NOT NULL,
    \`teacher_id\` BIGINT,
    PRIMARY KEY (\`id\`)
  );`);

  expect(exportRelationshipReportMarkdown(model)).toContain('course.teacher_id -> teacher.id');

  const rejectedModel = {
    ...model,
    inferredRelations: model.inferredRelations.map((relation) => ({
      ...relation,
      status: 'rejected' as const,
    })),
  };

  expect(exportRelationshipReportMarkdown(rejectedModel)).not.toContain('course.teacher_id');
  expect(exportRelationshipReportMarkdown(rejectedModel)).toContain('无待确认推断关系');
});
