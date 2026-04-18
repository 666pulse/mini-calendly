import { Hono } from "hono";
import type { Env } from "../app";
import dashboard from "./admin/dashboard";
import events from "./admin/events";
import bookings from "./admin/bookings";
import accounts from "./admin/accounts";

const app = new Hono<Env>();

app.route("/", dashboard);
app.route("/events", events);
app.route("/bookings", bookings);
app.route("/accounts", accounts);

export default app;
