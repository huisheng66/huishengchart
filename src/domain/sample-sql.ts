export const sampleSql = `CREATE TABLE \`major\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '专业编号',
  \`name\` VARCHAR(80) NOT NULL COMMENT '专业名称',
  \`college\` VARCHAR(80) COMMENT '所属学院',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_major_name\` (\`name\`)
) ENGINE=InnoDB COMMENT='专业表';

CREATE TABLE \`teacher\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '教师编号',
  \`name\` VARCHAR(50) NOT NULL COMMENT '教师姓名',
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB COMMENT='教师表';

CREATE TABLE \`student\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '学生编号',
  \`name\` VARCHAR(50) NOT NULL COMMENT '学生姓名',
  \`major_id\` BIGINT NOT NULL COMMENT '专业编号',
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_student_major\` FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
) ENGINE=InnoDB COMMENT='学生表';

CREATE TABLE \`course\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '课程编号',
  \`title\` VARCHAR(100) NOT NULL COMMENT '课程名称',
  \`teacher_id\` BIGINT COMMENT '教师编号',
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB COMMENT='课程表';`;
