import { createD1Adapter } from "./db/d1-adapter";
import { initSchema } from "./db/schema";
import { createApp } from "./app";

type CloudflareBindings = {
  DB: D1Database;
  ADMIN_USER?: string;
  ADMIN_PASS?: string;
};

const app = createApp((c) => {
  const env = c.env as CloudflareBindings;
  return createD1Adapter(env.DB);
});

export default {
  async fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
    try {
      const adapter = createD1Adapter(env.DB);
      await initSchema(adapter);
      return app.fetch(request, env, ctx);
    } catch (e: any) {
      return new Response(`Error: ${e.message}\n${e.stack}`, { status: 500 });
    }
  },
};
