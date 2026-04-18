import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import type { DbAdapter } from "./db/adapter";
import admin from "./routes/admin";
import home from "./routes/home";
import booking from "./routes/booking";

export type Env = {
  Bindings: {
    ADMIN_USER?: string;
    ADMIN_PASS?: string;
    TENCENT_MEETING_TOKEN?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    /** @deprecated replaced by google_accounts table; kept only for Import-legacy fallback */
    GOOGLE_REFRESH_TOKEN?: string;
    /** AES-GCM 256 key, base64. Required for google_accounts refresh_token encryption. */
    GOOGLE_MEETING_OAUTH_ENC_KEY?: string;
    /** Override base URL for OAuth redirect_uri (used behind reverse proxy). */
    APP_BASE_URL?: string;
  };
  Variables: {
    db: DbAdapter;
  };
};

export function getEnvVar(c: any, key: string, fallback = ""): string {
  return c.env?.[key] || (typeof process !== "undefined" ? process.env[key] : undefined) || fallback;
}

export function createApp(getDb: (c: any) => DbAdapter) {
  const app = new Hono<Env>({ strict: false });

  // Inject db into context
  app.use("*", async (c, next) => {
    c.set("db", getDb(c));
    await next();
  });

  // Admin auth
  app.use("/admin", async (c, next) => {
    const auth = basicAuth({
      username: getEnvVar(c, "ADMIN_USER", "admin"),
      password: getEnvVar(c, "ADMIN_PASS", "admin"),
    });
    return auth(c, next);
  });
  app.use("/admin/*", async (c, next) => {
    const auth = basicAuth({
      username: getEnvVar(c, "ADMIN_USER", "admin"),
      password: getEnvVar(c, "ADMIN_PASS", "admin"),
    });
    return auth(c, next);
  });

  // Routes
  app.route("/admin", admin);
  app.route("/", home);
  app.route("/", booking);

  return app;
}
