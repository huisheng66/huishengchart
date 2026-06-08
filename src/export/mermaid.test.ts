import { parseMySqlToErModel } from '../sql/mysql-parser';
import { exportMermaidEr } from './mermaid';

const sql = `CREATE TABLE \`major\` (
  \`id\` BIGINT NOT NULL,
  \`name\` VARCHAR(80) NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`student\` (
  \`id\` BIGINT NOT NULL,
  \`major_id\` BIGINT NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_student_major\` FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
);`;

it('exports Mermaid ER source with PK and FK markers', () => {
  const mermaid = exportMermaidEr(parseMySqlToErModel(sql));

  expect(mermaid).toContain('erDiagram');
  expect(mermaid).toContain('student }o--|| major : "fk_student_major"');
  expect(mermaid).toContain('BIGINT id PK');
  expect(mermaid).toContain('BIGINT major_id FK');
});
