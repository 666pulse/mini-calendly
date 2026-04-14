import { Hono } from "hono";
import type { Env } from "../app";
import dashboard from "./admin/dashboard";
import events from "./admin/events";
import bookings from "./admin/bookings";

const app = new Hono<Env>();

app.route("/", dashboard);
app.route("/events", events);
app.route("/bookings", bookings);

export default app;
