import { Hono } from "hono";
import type { Env } from "../../app";
import * as EventTypesService from "../../services/event-types.service";
import * as BookingsService from "../../services/bookings.service";
import { Layout } from "../../components/Layout";

const app = new Hono<Env>();

app.get("/", async (c) => {
  const db = c.get("db");
  const events = await EventTypesService.listAll(db);
  const bookings = await BookingsService.listRecent(db);

  return c.html(
    <Layout title="Admin - Mini Calendly">
      <div class="max-w-5xl mx-auto p-6">
        <div class="flex items-center justify-between mb-8">
          <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
          <a
            href="/admin/events/new"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow"
          >
            + New Event Type
          </a>
        </div>

        {/* Event Types */}
        <h2 class="text-lg font-semibold text-slate-900 mb-4">Event Types</h2>
        <div class="grid gap-4 mb-10">
          {events.length === 0 ? (
            <p class="text-slate-500">No event types yet. Create one to get started.</p>
          ) : (
            events.map((event) => (
              <div class="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:shadow-sm transition-all duration-200">
                <div>
                  <div class="flex items-center gap-3">
                    <div class="w-1 h-10 rounded-full bg-indigo-600" />
                    <div>
                      <h3 class="font-semibold text-slate-900">{event.name}</h3>
                      <p class="text-sm text-slate-500">
                        {event.duration_minutes} min &middot; {event.host_name}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <a
                    href={`/${event.slug}`}
                    target="_blank"
                    class="text-indigo-600 text-sm hover:underline"
                  >
                    Preview
                  </a>
                  <a
                    href={`/admin/events/${event.id}/bookings`}
                    class="text-slate-500 text-sm hover:text-slate-700 transition-colors"
                  >
                    Bookings
                  </a>
                  <a
                    href={`/admin/events/${event.id}`}
                    class="text-slate-500 text-sm hover:text-slate-700 transition-colors"
                  >
                    Edit
                  </a>
                  <button
                    class="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    onclick={`navigator.clipboard.writeText(window.location.origin + '/${event.slug}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy Link', 1500)`}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bookings */}
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-slate-900">Recent Bookings</h2>
          <a href="/admin/bookings" class="text-indigo-600 text-sm hover:underline">View all</a>
        </div>
        {bookings.length === 0 ? (
          <p class="text-slate-500">No bookings yet.</p>
        ) : (
          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="text-left px-4 py-3 font-medium text-slate-600">Event</th>
                  <th class="text-left px-4 py-3 font-medium text-slate-600">Invitee</th>
                  <th class="text-left px-4 py-3 font-medium text-slate-600">Date & Time</th>
                  <th class="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th class="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr class="border-b border-slate-100">
                    <td class="px-4 py-3">{b.event_name}</td>
                    <td class="px-4 py-3">
                      <div>{b.invitee_name}</div>
                      <div class="text-slate-400">{b.invitee_email}</div>
                    </td>
                    <td class="px-4 py-3">
                      {b.start_time.replace("T", " ")}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${
                          b.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      {b.status === "confirmed" && (
                        <a
                          href={`/admin/bookings/${b.id}/cancel`}
                          class="text-red-500 hover:underline text-xs"
                        >
                          Cancel
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
});

export default app;
