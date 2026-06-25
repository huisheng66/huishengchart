import { parseMySqlToErModel } from '../sql/mysql-parser';
import { detectConceptualStyle } from './chen-ticketing';

describe('detectConceptualStyle', () => {
  it('returns null when required ticketing tables are missing', () => {
    const sql = `CREATE TABLE \`student\` (
      \`id\` BIGINT NOT NULL,
      \`name\` VARCHAR(50) NOT NULL,
      PRIMARY KEY (\`id\`)
    );`;
    expect(detectConceptualStyle(parseMySqlToErModel(sql))).toBeNull();
  });

  it('returns null when only some required tables exist', () => {
    const sql = `CREATE TABLE \`account\` (
      \`id\` BIGINT NOT NULL,
      PRIMARY KEY (\`id\`)
    );

    CREATE TABLE \`passenger\` (
      \`id\` BIGINT NOT NULL,
      PRIMARY KEY (\`id\`)
    );`;
    expect(detectConceptualStyle(parseMySqlToErModel(sql))).toBeNull();
  });

  it('returns a ConceptualStyle when all 10 required tables exist', () => {
    const sql = `CREATE TABLE \`account\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`passenger\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`ticket_order\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`ticket\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train_run\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train_stop\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`station\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`seat\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`seat_type\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));`;

    const style = detectConceptualStyle(parseMySqlToErModel(sql));
    expect(style).not.toBeNull();
    expect(style!.tableLabels['account']).toBe('账号');
    expect(style!.tableLabels['passenger']).toBe('乘车人');
    expect(style!.entityPositions['account']).toEqual({ x: 180, y: 560 });
  });

  it('includes relation names only for declared foreign keys that match', () => {
    const sql = `CREATE TABLE \`account\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`passenger\` (\`id\` BIGINT NOT NULL, \`account_id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_passenger_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`account\`(\`id\`));
    CREATE TABLE \`ticket_order\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`ticket\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train_run\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train_stop\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`station\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`seat\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`seat_type\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));`;

    const model = parseMySqlToErModel(sql);
    const style = detectConceptualStyle(model);
    expect(style).not.toBeNull();

    const passengerAccountRel = model.relations.find(
      (r) => r.sourceTableId === 'passenger' && r.targetTableId === 'account'
    );
    expect(passengerAccountRel).toBeDefined();
    expect(style!.relationNames[passengerAccountRel!.id]).toBe('维护');
  });
});
