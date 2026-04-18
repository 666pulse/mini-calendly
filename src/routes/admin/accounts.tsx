import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { type Env, getEnvVar } from "../../app";
import { Layout } from "../../components/Layout";
import * as GoogleAccountsService from "../../services/google-accounts.service";
import {
  exchangeCodeForTokens,
  decodeIdToken,
  revokeToken,
} from "../../services/google-meet.service";
import { encryptSecret, signState, verifyState, decryptSecret } from "../../lib/crypto";

const app = new Hono<Env>();

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

// Build absolute callback URL from the current request.
// Respects APP_BASE_URL env override for reverse proxy setups.
function callbackUrl(c: any): string {
  const configured = getEnvVar(c, "APP_BASE_URL");
  const base = configured || new URL(c.req.url).origin;
  return `${base}/admin/accounts/oauth/google/callback`;
}

function requireKeys(c: any): { clientId: string; clientSecret: string; encKey: string } | null {
  const clientId = getEnvVar(c, "GOOGLE_CLIENT_ID");
  const clientSecret = getEnvVar(c, "GOOGLE_CLIENT_SECRET");
  const encKey = getEnvVar(c, "GOOGLE_MEETING_OAUTH_ENC_KEY");
  if (!clientId || !clientSecret || !encKey) return null;
  return { clientId, clientSecret, encKey };
}

// -- List page -----------------------------------------------------------

app.get("/", async (c) => {
  const db = c.get("db");
  const accounts = await GoogleAccountsService.list(db);
  const connected = c.req.query("connected") === "1";
  const error = c.req.query("error") || "";
  const keys = requireKeys(c);
  const canConnect = !!keys;
  const hasLegacyEnv =
    !!getEnvVar(c, "GOOGLE_REFRESH_TOKEN") && accounts.length === 0;

  return c.html(
    <Layout title="Google Accounts - Admin">
      <div class="max-w-5xl mx-auto p-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-slate-900">Google Accounts</h1>
          <a href="/admin" class="text-slate-500 text-sm hover:text-slate-700">Back to dashboard</a>
        </div>

        {connected && (
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4 text-sm text-emerald-800">
            账号连接成功。
          </div>
        )}
        {error && (
          <div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
            连接失败：{error}
          </div>
        )}
        {!canConnect && (
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4 text-sm text-yellow-800">
            缺少 <code class="font-mono">GOOGLE_CLIENT_ID</code> / <code class="font-mono">GOOGLE_CLIENT_SECRET</code> / <code class="font-mono">GOOGLE_MEETING_OAUTH_ENC_KEY</code> 环境变量。连接按钮已禁用。
          </div>
        )}

        <div class="flex items-center gap-3 mb-6">
          {canConnect ? (
            <a
              href="/admin/accounts/oauth/google/start"
              class="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              + Connect Google Account
            </a>
          ) : (
            <span class="bg-slate-100 text-slate-400 px-5 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
              + Connect Google Account
            </span>
          )}
          {hasLegacyEnv && canConnect && (
            <form method="post" action="/admin/accounts/import-legacy">
              <button
                type="submit"
                class="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Import legacy env token
              </button>
            </form>
          )}
        </div>

        {accounts.length === 0 ? (
          <div class="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p class="text-slate-500 text-sm mb-1">还没有连接的 Google 账号</p>
            <p class="text-slate-400 text-xs">点击上方按钮连接你的第一个账号。</p>
          </div>
        ) : (
          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {accounts.map((a) => (
              <div class="flex items-center gap-5 px-6 py-5">
                <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round" />
                    <circle cx="12" cy="7" r="4" stroke-width="2" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-slate-900 truncate">{a.email}</p>
                  {a.display_name && (
                    <p class="text-sm text-slate-500 truncate">{a.display_name}</p>
                  )}
                  {a.last_refreshed_at && (
                    <p class="text-xs text-slate-400 mt-1">
                      Last refreshed: {a.last_refreshed_at}
                    </p>
                  )}
                  {a.status === "invalid" && a.last_error && (
                    <p class="text-xs text-red-500 mt-1 truncate">Error: {a.last_error}</p>
                  )}
                </div>
                <StatusBadge status={a.status} />
                <form method="post" action={`/admin/accounts/${a.id}/disconnect`}>
                  <button
                    type="submit"
                    class="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                    onclick="return confirm('Disconnect this account? Bound event types will no longer auto-create meetings.')"
                  >
                    Disconnect
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
});

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "invalid"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-500";
  return (
    <span class={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// -- OAuth flow ----------------------------------------------------------

app.get("/oauth/google/start", async (c) => {
  const keys = requireKeys(c);
  if (!keys) return c.redirect("/admin/accounts?error=missing_credentials");

  const state = crypto.randomUUID();
  const signed = await signState(state, keys.encKey);
  setCookie(c, "oauth_state", signed, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", keys.clientId);
  url.searchParams.set("redirect_uri", callbackUrl(c));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return c.redirect(url.toString());
});

app.get("/oauth/google/callback", async (c) => {
  const keys = requireKeys(c);
  if (!keys) return c.redirect("/admin/accounts?error=missing_credentials");

  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const errorParam = c.req.query("error");

  if (errorParam) {
    deleteCookie(c, "oauth_state");
    return c.redirect(`/admin/accounts?error=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !stateParam) {
    return c.redirect("/admin/accounts?error=missing_code_or_state");
  }

  const signedCookie = getCookie(c, "oauth_state");
  deleteCookie(c, "oauth_state");
  if (!signedCookie) return c.redirect("/admin/accounts?error=state_cookie_missing");

  const verified = await verifyState(signedCookie, keys.encKey);
  if (!verified || verified !== stateParam) {
    return c.redirect("/admin/accounts?error=state_mismatch");
  }

  try {
    const tokens = await exchangeCodeForTokens(
      keys.clientId,
      keys.clientSecret,
      code,
      callbackUrl(c)
    );
    if (!tokens.refresh_token) {
      return c.redirect("/admin/accounts?error=no_refresh_token");
    }

    const idPayload = tokens.id_token ? decodeIdToken(tokens.id_token) : null;
    const sub = idPayload?.sub;
    const email = idPayload?.email;
    const name = idPayload?.name || "";
    if (!sub || !email) {
      return c.redirect("/admin/accounts?error=id_token_missing_fields");
    }

    const encrypted = await encryptSecret(tokens.refresh_token, keys.encKey);
    const db = c.get("db");
    await GoogleAccountsService.upsertFromOAuth(db, {
      google_user_id: sub,
      email,
      display_name: name,
      refresh_token_encrypted: encrypted,
      scope: tokens.scope || SCOPES,
    });
    return c.redirect("/admin/accounts?connected=1");
  } catch (e: any) {
    console.error("OAuth callback failed:", e);
    return c.redirect(
      `/admin/accounts?error=${encodeURIComponent(e.message?.slice(0, 200) || "exchange_failed")}`
    );
  }
});

// -- Disconnect ----------------------------------------------------------

app.post("/:id/disconnect", async (c) => {
  const keys = requireKeys(c);
  const id = Number(c.req.param("id"));
  const db = c.get("db");
  const account = await GoogleAccountsService.findById(db, id);
  if (account && keys) {
    try {
      const refresh = await decryptSecret(account.refresh_token_encrypted, keys.encKey);
      await revokeToken(refresh);
    } catch (e) {
      console.warn("Failed to revoke token at Google side:", e);
    }
  }
  await GoogleAccountsService.remove(db, id);
  return c.redirect("/admin/accounts");
});

// -- Legacy env-token import ---------------------------------------------

app.post("/import-legacy", async (c) => {
  const keys = requireKeys(c);
  if (!keys) return c.redirect("/admin/accounts?error=missing_credentials");

  const legacyRefresh = getEnvVar(c, "GOOGLE_REFRESH_TOKEN");
  if (!legacyRefresh) return c.redirect("/admin/accounts?error=no_legacy_token");

  const db = c.get("db");
  try {
    // Use the legacy refresh token to fetch user info, then store as proper account.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: keys.clientId,
        client_secret: keys.clientSecret,
        refresh_token: legacyRefresh,
        grant_type: "refresh_token",
      }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`refresh failed: ${text.slice(0, 200)}`);
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) throw new Error(`userinfo failed: ${userRes.status}`);
    const user = (await userRes.json()) as { sub: string; email: string; name?: string };

    const encrypted = await encryptSecret(legacyRefresh, keys.encKey);
    await GoogleAccountsService.upsertFromOAuth(db, {
      google_user_id: user.sub,
      email: user.email,
      display_name: user.name || "",
      refresh_token_encrypted: encrypted,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });
    return c.redirect("/admin/accounts?connected=1");
  } catch (e: any) {
    console.error("Legacy import failed:", e);
    return c.redirect(
      `/admin/accounts?error=${encodeURIComponent(e.message?.slice(0, 200) || "import_failed")}`
    );
  }
});

export default app;
