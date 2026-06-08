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
