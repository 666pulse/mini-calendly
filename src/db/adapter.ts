export interface DbAdapter {
  run(sql: string, params?: unknown[]): Promise<{ lastInsertRowid: number }>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}
