import { createSqliteAdapter } from "./db/sqlite-adapter";
import { initSchema } from "./db/schema";
import { createApp } from "./app";

const adapter = createSqliteAdapter();
await initSchema(adapter);

const app = createApp(() => adapter);

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log("Calendly running at http://localhost:3000");
