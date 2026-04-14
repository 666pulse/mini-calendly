import type { DbAdapter } from "../db/adapter";

type HookFn = (db: DbAdapter, table: string, id: number) => Promise<void>;

const afterUpdate: HookFn[] = [];
const afterCreate: HookFn[] = [];

export function onAfterUpdate(fn: HookFn) {
  afterUpdate.push(fn);
}

export function onAfterCreate(fn: HookFn) {
  afterCreate.push(fn);
}

export async function emitAfterUpdate(db: DbAdapter, table: string, id: number) {
  for (const fn of afterUpdate) {
    await fn(db, table, id);
  }
}

export async function emitAfterCreate(db: DbAdapter, table: string, id: number) {
  for (const fn of afterCreate) {
    await fn(db, table, id);
  }
}

// Built-in: auto-update updated_at
onAfterUpdate(async (db, table, id) => {
  await db.run(`UPDATE ${table} SET updated_at = datetime('now') WHERE id = ?`, [id]);
});
