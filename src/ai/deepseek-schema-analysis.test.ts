import { expect, it, vi } from 'vitest';
import { parseMySqlToErModel } from '../sql/mysql-parser';
import { analyzeSchemaWithDeepSeek, parseDeepSeekSchemaAnalysis } from './deepseek-schema-analysis';

const sql = `CREATE TABLE \`customer\` (
  \`id\` BIGINT NOT NULL,
  \`customer_name\` VARCHAR(80) NOT NULL,
  PRIMARY KEY (\`id\`)
);

CREATE TABLE \`sales_order\` (
  \`id\` BIGINT NOT NULL,
  \`customer_id\` BIGINT NOT NULL,
  \`order_no\` VARCHAR(40) NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_sales_order_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customer\`(\`id\`)
);`;

it('calls the DeepSeek chat completions API with a strict schema-analysis prompt', async () => {
  const model = parseMySqlToErModel(sql);
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              tables: [{ tableId: 'customer', label: '客户', group: 'actor' }],
              relations: [
                {
                  relationId: 'sales_order:customer_id->customer:id',
                  label: '创建',
                  importance: 'primary',
                },
              ],
            }),
          },
        },
      ],
    }),
  });

  const result = await analyzeSchemaWithDeepSeek(model, {
    apiKey: 'test-key',
    fetchImpl,
  });
  const [url, init] = fetchImpl.mock.calls[0];
  const body = JSON.parse(init.body as string);

  expect(url).toBe('https://api.deepseek.com/chat/completions');
  expect(init.headers.Authorization).toBe('Bearer test-key');
  expect(body.model).toBe('deepseek-v4-flash');
  expect(body.response_format).toEqual({ type: 'json_object' });
  expect(body.messages[1].content).toContain('sales_order:customer_id->customer:id');
  expect(result.tableLabels.customer).toBe('客户');
  expect(result.relationLabels['sales_order:customer_id->customer:id']).toBe('创建');
  expect(result.primaryRelationIds).toEqual(['sales_order:customer_id->customer:id']);
});

it('filters model suggestions that reference tables or relations outside the parsed SQL', () => {
  const model = parseMySqlToErModel(sql);
  const result = parseDeepSeekSchemaAnalysis(
    JSON.stringify({
      tables: [
        { tableId: 'customer', label: '客户', group: 'actor' },
        { tableId: 'ghost', label: '不存在', group: 'core' },
      ],
      relations: [
        { relationId: 'sales_order:customer_id->customer:id', label: '创建', importance: 'primary' },
        { relationId: 'ghost:customer_id->customer:id', label: '伪造', importance: 'primary' },
      ],
    }),
    model
  );

  expect(result.tableLabels).toEqual({ customer: '客户' });
  expect(result.relationLabels).toEqual({ 'sales_order:customer_id->customer:id': '创建' });
  expect(result.primaryRelationIds).toEqual(['sales_order:customer_id->customer:id']);
});
