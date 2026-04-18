import type { DbAdapter } from "../db/adapter";
import type { GoogleAccount } from "./entities";
import { decryptSecret, encryptSecret } from "../lib/crypto";
import * as GoogleAccountsService from "./google-accounts.service";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleMeetInfo {
  event_id: string;
  meeting_url: string;
}

export class AccountInvalidError extends Error {
  constructor(public accountId: number, message: string) {
    super(message);
    this.name = "AccountInvalidError";
  }
}

function getProxy(): string | undefined {
  if (typeof process === "undefined") return undefined;
  return (
    process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY ||
    undefined
  );
}

/**
 * Exchange refresh token for access token, rotate refresh token if Google returns a new one.
 * Throws AccountInvalidError when Google rejects the refresh (invalid_grant) so callers can stop retrying.
 */
async function getAccessToken(
  db: DbAdapter,
  account: GoogleAccount,
  clientId: string,
  clientSecret: string,
  encKey: string
): Promise<string> {
  const refreshToken = await decryptSecret(account.refresh_token_encrypted, encKey);
  const proxy = getProxy();

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    ...(proxy ? { proxy } : {}),
  } as any);

  if (!res.ok) {
    const text = await res.text();
    // invalid_grant → refresh token revoked or expired; mark account invalid so it surfaces in UI.
    if (text.includes("invalid_grant")) {
      await GoogleAccountsService.markInvalid(db, account.id, text.slice(0, 500));
      throw new AccountInvalidError(
        account.id,
        `Google refresh token invalid for ${account.email}: reconnect required`
      );
    }
    throw new Error(`Google OAuth token refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
  };

  // Google may rotate the refresh token — persist the new one immediately.
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    const encrypted = await encryptSecret(data.refresh_token, encKey);
    await GoogleAccountsService.updateRefreshToken(db, account.id, encrypted);
  }

  return data.access_token;
}

export async function createMeeting(
  db: DbAdapter,
  account: GoogleAccount,
  clientId: string,
  clientSecret: string,
  encKey: string,
  subject: string,
  startTime: string, // ISO 8601: 2026-04-15T09:00:00+08:00
  endTime: string,
  timeZone = "Asia/Singapore"
): Promise<GoogleMeetInfo> {
  const accessToken = await getAccessToken(db, account, clientId, clientSecret, encKey);
  const proxy = getProxy();

  const payload = {
    summary: subject,
    start: { dateTime: startTime, timeZone },
    end: { dateTime: endTime, timeZone },
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      ...(proxy ? { proxy } : {}),
    } as any
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Google Calendar API ${res.status}: ${text}\nRequest: ${JSON.stringify(payload)}`
    );
  }

  const event = (await res.json()) as {
    id: string;
    conferenceData?: {
      entryPoints?: { entryPointType: string; uri: string }[];
    };
  };

  const videoEntry = event.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  );

  return {
    event_id: event.id,
    meeting_url: videoEntry?.uri || "",
  };
}

export async function cancelMeeting(
  db: DbAdapter,
  account: GoogleAccount,
  clientId: string,
  clientSecret: string,
  encKey: string,
  eventId: string
): Promise<void> {
  const accessToken = await getAccessToken(db, account, clientId, clientSecret, encKey);
  const proxy = getProxy();

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(proxy ? { proxy } : {}),
    } as any
  );

  // 404/410 means already deleted — not an error
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text();
    throw new Error(`Google Calendar delete failed: ${text}`);
  }
}

/**
 * OAuth helpers (used by /admin/oauth/google/* routes).
 * Exchange authorization code for refresh_token + id_token.
 */
export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ refresh_token: string; id_token: string; access_token: string; scope: string }> {
  const proxy = getProxy();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    ...(proxy ? { proxy } : {}),
  } as any);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google code exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as any;
}

/** Decode an id_token payload (no signature verification — token comes direct from Google over TLS). */
export function decodeIdToken(idToken: string): {
  sub: string;
  email: string;
  name?: string;
} {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid id_token format");
  const payloadB64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
  const pad = payloadB64.length % 4 === 0 ? "" : "=".repeat(4 - (payloadB64.length % 4));
  const json = atob(payloadB64 + pad);
  return JSON.parse(json);
}

/** Best-effort revoke at Google's side. Errors are swallowed. */
export async function revokeToken(refreshToken: string): Promise<void> {
  const proxy = getProxy();
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
      method: "POST",
      ...(proxy ? { proxy } : {}),
    } as any);
  } catch {
    // ignore
  }
}
