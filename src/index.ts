import { Hono } from "hono";
import { initDB } from "./db/index";
import admin from "./routes/admin";
import booking from "./routes/booking";

// Initialize database
initDB();

const app = new Hono();

// Admin routes
app.route("/admin", admin);

// Home -> redirect to admin
app.get("/", (c) => c.redirect("/admin"));

// Public booking routes (must be last - catches /:slug)
app.route("/", booking);

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log("Calendly running at http://localhost:3000");
