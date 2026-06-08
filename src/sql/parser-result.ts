import type { ErModel } from '../domain/er-model';
import { parseMySqlToErModel } from './mysql-parser';

export type ParseResult =
  | { ok: true; model: ErModel; warnings: string[] }
  | { ok: false; error: { message: string }; warnings: string[] };

export function parseMySqlSafely(sql: string): ParseResult {
  try {
    return { ok: true, model: parseMySqlToErModel(sql), warnings: [] };
  } catch (error) {
    return {
      ok: false,
      error: { message: error instanceof Error ? error.message : 'Unknown SQL parse error.' },
      warnings: [],
    };
  }
}
