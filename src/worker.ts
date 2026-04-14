import { createD1Adapter } from "./db/d1-adapter";
import { initSchema } from "./db/schema";
import { createApp } from "./app";

type CloudflareBindings = {
  DB: D1Database;
  ADMIN_USER?: string;
  ADMIN_PASS?: string;
};

let schemaInitialized = false;

const app = createApp((c) => {
  const env = c.env as CloudflareBindings;
  return createD1Adapter(env.DB);
});

// Initialize schema on first request
const originalFetch = app.fetch;
export default {
  async fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
    if (!schemaInitialized) {
      const adapter = createD1Adapter(env.DB);
      await initSchema(adapter);
      schemaInitialized = true;
    }
    return originalFetch.call(app, request, env, ctx);
  },
};
