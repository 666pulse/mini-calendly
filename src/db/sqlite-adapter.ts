import { Database } from "bun:sqlite";
import { join } from "path";
import type { DbAdapter } from "./adapter";

export function createSqliteAdapter(): DbAdapter {
  const dbPath = join(import.meta.dir, "../../db/data.db");
  const db = new Database(dbPath, { create: true });
  db.run("PRAGMA journal_mode = WAL");

  return {
    async run(sql, params = []) {
      const result = db.run(sql, params as any[]);
      return { lastInsertRowid: Number(result.lastInsertRowid) };
    },
    async get<T>(sql: string, params: unknown[] = []) {
      return db.query(sql).get(...(params as any[])) as T | null;
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return db.query(sql).all(...(params as any[])) as T[];
    },
    async exec(sql) {
      db.exec(sql);
    },
  };
}
