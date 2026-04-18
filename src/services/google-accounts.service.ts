import type { DbAdapter } from "../db/adapter";
import type { GoogleAccount } from "./entities";
import { emitAfterCreate, emitAfterUpdate } from "../lib/hooks";

export async function list(db: DbAdapter) {
  return db.all<GoogleAccount>(
    `SELECT * FROM google_accounts
     ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'invalid' THEN 1 ELSE 2 END,
              created_at DESC`
  );
}

export async function listActive(db: DbAdapter) {
  return db.all<GoogleAccount>(
    "SELECT * FROM google_accounts WHERE status = 'active' ORDER BY created_at DESC"
  );
}

export async function findById(db: DbAdapter, id: number) {
  return db.get<GoogleAccount>("SELECT * FROM google_accounts WHERE id = ?", [id]);
}

export async function findByGoogleUserId(db: DbAdapter, sub: string) {
  return db.get<GoogleAccount>(
    "SELECT * FROM google_accounts WHERE google_user_id = ?",
    [sub]
  );
}

export async function upsertFromOAuth(
  db: DbAdapter,
  data: {
    google_user_id: string;
    email: string;
    display_name: string;
    refresh_token_encrypted: string;
    scope: string;
  }
): Promise<number> {
  const existing = await findByGoogleUserId(db, data.google_user_id);
  if (existing) {
    await db.run(
      `UPDATE google_accounts
         SET email = ?, display_name = ?, refresh_token_encrypted = ?,
             scope = ?, status = 'active', last_error = '',
             last_refreshed_at = datetime('now')
       WHERE id = ?`,
      [
        data.email,
        data.display_name,
        data.refresh_token_encrypted,
        data.scope,
        existing.id,
      ]
    );
    await emitAfterUpdate(db, "google_accounts", existing.id);
    return existing.id;
  }
  const result = await db.run(
    `INSERT INTO google_accounts
       (google_user_id, email, display_name, refresh_token_encrypted, scope, status, last_refreshed_at)
     VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))`,
    [
      data.google_user_id,
      data.email,
      data.display_name,
      data.refresh_token_encrypted,
      data.scope,
    ]
  );
  await emitAfterCreate(db, "google_accounts", result.lastInsertRowid);
  return result.lastInsertRowid;
}

export async function updateRefreshToken(
  db: DbAdapter,
  id: number,
  encrypted: string
) {
  await db.run(
    `UPDATE google_accounts
       SET refresh_token_encrypted = ?, last_refreshed_at = datetime('now'),
           status = 'active', last_error = ''
     WHERE id = ?`,
    [encrypted, id]
  );
  await emitAfterUpdate(db, "google_accounts", id);
}

export async function markInvalid(db: DbAdapter, id: number, err: string) {
  await db.run(
    `UPDATE google_accounts
       SET status = 'invalid', last_error = ?
     WHERE id = ?`,
    [err.slice(0, 500), id]
  );
  await emitAfterUpdate(db, "google_accounts", id);
}

export async function remove(db: DbAdapter, id: number) {
  await db.run("DELETE FROM google_accounts WHERE id = ?", [id]);
  await db.run(
    "UPDATE event_types SET google_account_id = NULL WHERE google_account_id = ?",
    [id]
  );
}
