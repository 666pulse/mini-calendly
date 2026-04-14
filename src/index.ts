import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { initDB } from "./db/index";
import admin from "./routes/admin";
import home from "./routes/home";
import booking from "./routes/booking";

// Initialize database
initDB();

const app = new Hono({ strict: false });

// Admin routes with basic auth
const auth = basicAuth({
  username: process.env.ADMIN_USER || "admin",
  password: process.env.ADMIN_PASS || "admin",
});
app.use("/admin", auth);
app.use("/admin/*", auth);
app.route("/admin", admin);

// Home -> event list
app.route("/", home);

// Public booking routes (must be last - catches /:slug)
app.route("/", booking);

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log("Calendly running at http://localhost:3000");
