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
  };
  Variables: {
    db: DbAdapter;
  };
};

export function createApp(getDb: (c: any) => DbAdapter) {
  const app = new Hono<Env>({ strict: false });

  // Inject db into context
  app.use("*", async (c, next) => {
    c.set("db", getDb(c));
    await next();
  });

  // Admin auth — reads from env bindings (CF) or process.env (Bun)
  const getEnv = (c: any, key: string, fallback: string) => {
    return c.env?.[key] || (typeof process !== "undefined" ? process.env[key] : undefined) || fallback;
  };

  app.use("/admin", async (c, next) => {
    const auth = basicAuth({
      username: getEnv(c, "ADMIN_USER", "admin"),
      password: getEnv(c, "ADMIN_PASS", "admin"),
    });
    return auth(c, next);
  });
  app.use("/admin/*", async (c, next) => {
    const auth = basicAuth({
      username: getEnv(c, "ADMIN_USER", "admin"),
      password: getEnv(c, "ADMIN_PASS", "admin"),
    });
    return auth(c, next);
  });

  // Routes
  app.route("/admin", admin);
  app.route("/", home);
  app.route("/", booking);

  return app;
}
