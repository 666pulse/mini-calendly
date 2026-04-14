import type { DbAdapter } from "./adapter";

export function createD1Adapter(d1: D1Database): DbAdapter {
  return {
    async run(sql, params = []) {
      const result = await d1.prepare(sql).bind(...params).run();
      return { lastInsertRowid: result.meta.last_row_id ?? 0 };
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return await d1.prepare(sql).bind(...params).first<T>();
    },
    async all<T>(sql: string, params: unknown[] = []) {
      const result = await d1.prepare(sql).bind(...params).all<T>();
      return result.results;
    },
    async exec(sql) {
      await d1.exec(sql);
    },
  };
}
