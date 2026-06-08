import { parseMySqlSafely } from './parser-result';

it('returns a model result for valid SQL', () => {
  const result = parseMySqlSafely('CREATE TABLE `student` (`id` BIGINT NOT NULL, PRIMARY KEY (`id`));');

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.model.tables[0].name).toBe('student');
  }
});

it('returns an error result for invalid SQL', () => {
  const result = parseMySqlSafely('CREATE TABLE broken (');

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.message.length).toBeGreaterThan(0);
  }
});
