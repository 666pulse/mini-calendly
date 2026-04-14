import { Hono } from "hono";
import type { Env } from "../app";
import * as EventTypesService from "../services/event-types.service";
import * as BookingsService from "../services/bookings.service";
import { Layout } from "../components/Layout";
import { CustomFieldsEditor } from "../components/CustomFieldsEditor";
import { AvailabilityEditor } from "../components/AvailabilityEditor";
import type { CustomField } from "../services/entities";

const app = new Hono<Env>();

// Admin dashboard
app.get("/", async (c) => {
  const db = c.get("db");
  const events = await EventTypesService.listAll(db);
  const bookings = await BookingsService.listRecent(db);

  return c.html(
    <Layout title="Admin - Calendly">
      <div class="max-w-5xl mx-auto p-6">
        <div class="flex items-center justify-between mb-8">
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <a
            href="/admin/events/new"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Event Type
          </a>
        </div>

        {/* Event Types */}
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Event Types</h2>
        <div class="grid gap-4 mb-10">
          {events.length === 0 ? (
            <p class="text-gray-500">No event types yet. Create one to get started.</p>
          ) : (
            events.map((event) => (
              <div class="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-3">
                    <div class="w-1 h-10 rounded-full" style={`background: ${event.color}`} />
                    <div>
                      <h3 class="font-semibold text-gray-900">{event.name}</h3>
                      <p class="text-sm text-gray-500">
                        {event.duration_minutes} min &middot; {event.host_name}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <a
                    href={`/${event.slug}`}
                    target="_blank"
                    class="text-blue-600 text-sm hover:underline"
                  >
                    Preview
                  </a>
                  <a
                    href={`/admin/events/${event.id}`}
                    class="text-gray-500 text-sm hover:text-gray-700"
                  >
                    Edit
                  </a>
                  <button
                    class="text-sm text-gray-400 hover:text-gray-600"
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
          <h2 class="text-lg font-semibold text-gray-900">Recent Bookings</h2>
          <a href="/admin/bookings" class="text-blue-600 text-sm hover:underline">View all</a>
        </div>
        {bookings.length === 0 ? (
          <p class="text-gray-500">No bookings yet.</p>
        ) : (
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Invitee</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr class="border-b border-gray-100">
                    <td class="px-4 py-3">{b.event_name}</td>
                    <td class="px-4 py-3">
                      <div>{b.invitee_name}</div>
                      <div class="text-gray-400">{b.invitee_email}</div>
                    </td>
                    <td class="px-4 py-3">
                      {b.start_time.replace("T", " ")}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          b.status === "confirmed"
                            ? "bg-green-100 text-green-700"
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

// New event type form
app.get("/events/new", (c) => {
  return c.html(
    <Layout title="New Event Type">
      <div class="max-w-xl mx-auto p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Create Event Type</h1>
        <form method="POST" action="/admin/events" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
            <input type="text" name="name" required class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g. 30 Minute Meeting" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
            <input type="text" name="slug" required class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g. 30min-meeting" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Host *</label>
            <input type="text" name="host_name" required class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Your name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
            <input type="number" name="duration" required value="30" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={2} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" name="start_date" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" name="end_date" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <AvailabilityEditor data={{
            0: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "13:00", end_time: "17:00" }],
            1: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "13:00", end_time: "17:00" }],
            2: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "13:00", end_time: "17:00" }],
            3: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "13:00", end_time: "17:00" }],
            4: [{ start_time: "09:00", end_time: "12:00" }, { start_time: "13:00", end_time: "17:00" }],
          }} />

          <CustomFieldsEditor fields={[]} />

          <div class="flex gap-3 pt-2">
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Create
            </button>
            <a href="/admin" class="px-6 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</a>
          </div>
        </form>
      </div>
    </Layout>
  );
});

// Create event type
app.post("/events", async (c) => {
  const db = c.get("db");
  const body = await c.req.parseBody();

  const eventTypeId = await EventTypesService.create(db, {
    slug: body.slug as string,
    name: body.name as string,
    host_name: body.host_name as string,
    duration_minutes: Number(body.duration),
    description: (body.description as string) || "",
    custom_fields: (body.custom_fields_json as string) || "[]",
    start_date: (body.start_date as string) || null,
    end_date: (body.end_date as string) || null,
  });

  const availJson = JSON.parse((body.availability_json as string) || "{}");
  const slots: { day_of_week: number; start_time: string; end_time: string }[] = [];
  for (const [day, blocks] of Object.entries(availJson)) {
    for (const block of blocks as { start_time: string; end_time: string }[]) {
      slots.push({ day_of_week: Number(day), start_time: block.start_time, end_time: block.end_time });
    }
  }
  await EventTypesService.replaceAvailability(db, eventTypeId, slots);

  return c.redirect("/admin");
});

// Edit event type
app.get("/events/:id", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const event = await EventTypesService.findById(db, id);
  if (!event) return c.redirect("/admin");

  const avails = await EventTypesService.getAvailability(db, id);
  const availData: Record<number, { start_time: string; end_time: string }[]> = {};
  for (const a of avails) {
    if (!availData[a.day_of_week]) availData[a.day_of_week] = [];
    availData[a.day_of_week].push({ start_time: a.start_time, end_time: a.end_time });
  }

  return c.html(
    <Layout title={`Edit ${event.name}`}>
      <div class="max-w-xl mx-auto p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Event Type</h1>
        <form method="POST" action={`/admin/events/${id}`} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
            <input type="text" name="name" required value={event.name} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
            <input type="text" name="slug" required value={event.slug} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Host</label>
            <input type="text" name="host_name" required value={event.host_name} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input type="number" name="duration" required value={String(event.duration_minutes)} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={2} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">{event.description}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" name="start_date" value={event.start_date || ""} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" name="end_date" value={event.end_date || ""} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <AvailabilityEditor data={availData} />

          <CustomFieldsEditor fields={JSON.parse(event.custom_fields || "[]") as CustomField[]} />

          <div class="flex gap-3 pt-2">
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Save Changes
            </button>
            <a href="/admin" class="px-6 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</a>
          </div>
        </form>

        <form method="POST" action={`/admin/events/${id}/delete`} class="mt-8 pt-6 border-t border-gray-200">
          <button type="submit" class="text-red-500 text-sm hover:underline" onclick="return confirm('Delete this event type and all its bookings?')">
            Delete this event type
          </button>
        </form>
      </div>
    </Layout>
  );
});

// Update event type
app.post("/events/:id", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const body = await c.req.parseBody();

  await EventTypesService.update(db, id, {
    slug: body.slug as string,
    name: body.name as string,
    host_name: body.host_name as string,
    duration_minutes: Number(body.duration),
    description: (body.description as string) || "",
    custom_fields: (body.custom_fields_json as string) || "[]",
    start_date: (body.start_date as string) || null,
    end_date: (body.end_date as string) || null,
  });

  const availJson = JSON.parse((body.availability_json as string) || "{}");
  const slots: { day_of_week: number; start_time: string; end_time: string }[] = [];
  for (const [day, blocks] of Object.entries(availJson)) {
    for (const block of blocks as { start_time: string; end_time: string }[]) {
      slots.push({ day_of_week: Number(day), start_time: block.start_time, end_time: block.end_time });
    }
  }
  await EventTypesService.replaceAvailability(db, id, slots);

  return c.redirect("/admin");
});

// Bookings list page
app.get("/bookings", async (c) => {
  const db = c.get("db");
  const events = await EventTypesService.listAll(db);

  const eventTypeId = c.req.query("event") ? Number(c.req.query("event")) : undefined;
  const status = c.req.query("status") || undefined;
  const search = c.req.query("search") || undefined;
  const page = Number(c.req.query("page")) || 1;

  const result = await BookingsService.list(db, { event_type_id: eventTypeId, status, search, page });

  const buildUrl = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const values = { event: eventTypeId, status, search, page, ...overrides };
    for (const [k, v] of Object.entries(values)) {
      if (v !== undefined && v !== "") params.set(k, String(v));
    }
    return `/admin/bookings?${params.toString()}`;
  };

  return c.html(
    <Layout title="Bookings - Admin">
      <div class="max-w-5xl mx-auto p-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Bookings</h1>
          <a href="/admin" class="text-gray-500 text-sm hover:text-gray-700">Back to dashboard</a>
        </div>

        {/* Filters */}
        <form method="GET" action="/admin/bookings" class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div class="flex flex-wrap gap-3 items-end">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Event</label>
              <select name="event" class="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                <option value="">All events</option>
                {events.map((e) => (
                  <option value={String(e.id)} selected={e.id === eventTypeId}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select name="status" class="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
                <option value="">All</option>
                <option value="confirmed" selected={status === "confirmed"}>Confirmed</option>
                <option value="cancelled" selected={status === "cancelled"}>Cancelled</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input type="text" name="search" value={search || ""} placeholder="Name or email" class="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-48" />
            </div>
            <button type="submit" class="bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-md text-sm font-medium text-gray-700">
              Filter
            </button>
            <a href="/admin/bookings" class="text-gray-400 text-sm hover:text-gray-600 py-1.5">Clear</a>
          </div>
        </form>

        {/* Results */}
        <div class="text-sm text-gray-500 mb-3">{result.total} bookings found</div>

        {result.rows.length === 0 ? (
          <p class="text-gray-500">No bookings match your filters.</p>
        ) : (
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Invitee</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((b) => (
                  <tr class="border-b border-gray-100">
                    <td class="px-4 py-3">{b.event_name}</td>
                    <td class="px-4 py-3">
                      <div>{b.invitee_name}</div>
                      <div class="text-gray-400">{b.invitee_email}</div>
                    </td>
                    <td class="px-4 py-3">{b.start_time.replace("T", " ")}</td>
                    <td class="px-4 py-3">
                      <span
                        class={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          b.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 space-x-2">
                      <a href={`/admin/bookings/${b.id}/detail`} class="text-blue-600 hover:underline text-xs">
                        View
                      </a>
                      {b.status === "confirmed" && (
                        <a href={`/admin/bookings/${b.id}/cancel`} class="text-red-500 hover:underline text-xs">
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

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div class="flex items-center justify-center gap-2 mt-6">
            {result.page > 1 && (
              <a href={buildUrl({ page: result.page - 1 })} class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Prev
              </a>
            )}
            <span class="text-sm text-gray-500">
              Page {result.page} of {result.totalPages}
            </span>
            {result.page < result.totalPages && (
              <a href={buildUrl({ page: result.page + 1 })} class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Next
              </a>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
});

// Delete event type
app.post("/events/:id/delete", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  await EventTypesService.remove(db, id);
  return c.redirect("/admin");
});

// Booking detail
app.get("/bookings/:id/detail", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const b = await BookingsService.findById(db, id);
  if (!b) return c.redirect("/admin/bookings");

  const customFields: CustomField[] = JSON.parse((b as any).custom_fields || "[]");
  const customData: Record<string, string> = JSON.parse(b.custom_data || "{}");

  const dateObj = new Date(b.start_time);
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const startTime = b.start_time.split("T")[1]?.replace(":00", "") || "";
  const endTime = b.end_time.split("T")[1]?.replace(":00", "") || "";

  return c.html(
    <Layout title={`Booking #${b.id}`}>
      <div class="max-w-2xl mx-auto p-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Booking Detail</h1>
          <a href="/admin/bookings" class="text-gray-500 text-sm hover:text-gray-700">Back to list</a>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          {/* Status */}
          <div class="flex items-center justify-between">
            <span
              class={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                b.status === "confirmed"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {b.status}
            </span>
            {b.status === "confirmed" && (
              <a href={`/admin/bookings/${b.id}/cancel`} class="text-red-500 text-sm hover:underline">
                Cancel booking
              </a>
            )}
          </div>

          {/* Event info */}
          <div class="border-b border-gray-100 pb-4">
            <h2 class="text-sm font-medium text-gray-500 mb-2">Event</h2>
            <p class="font-semibold text-gray-900">{b.event_name}</p>
            <p class="text-sm text-gray-500">{(b as any).host_name} &middot; {(b as any).duration_minutes} min</p>
          </div>

          {/* When */}
          <div class="border-b border-gray-100 pb-4">
            <h2 class="text-sm font-medium text-gray-500 mb-2">When</h2>
            <p class="text-gray-900">{dateLabel}</p>
            <p class="text-gray-900">{startTime} - {endTime}</p>
            <p class="text-sm text-gray-400 mt-1">{b.timezone}</p>
          </div>

          {/* Invitee */}
          <div class="border-b border-gray-100 pb-4">
            <h2 class="text-sm font-medium text-gray-500 mb-2">Invitee</h2>
            <p class="text-gray-900">{b.invitee_name}</p>
            <p class="text-sm text-gray-500">{b.invitee_email}</p>
          </div>

          {/* Custom fields */}
          {customFields.length > 0 && (
            <div class="border-b border-gray-100 pb-4">
              <h2 class="text-sm font-medium text-gray-500 mb-2">Additional Info</h2>
              <div class="space-y-1">
                {customFields.map((f) => (
                  <div class="flex">
                    <span class="text-sm text-gray-500 w-32">{f.label}</span>
                    <span class="text-sm text-gray-900">{customData[f.key] || "-"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {b.notes && (
            <div class="border-b border-gray-100 pb-4">
              <h2 class="text-sm font-medium text-gray-500 mb-2">Notes</h2>
              <p class="text-sm text-gray-900 whitespace-pre-wrap">{b.notes}</p>
            </div>
          )}

          {/* Meta */}
          <div>
            <h2 class="text-sm font-medium text-gray-500 mb-2">Meta</h2>
            <div class="text-sm text-gray-400 space-y-0.5">
              <p>Booking ID: {b.id}</p>
              <p>Created: {b.created_at}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});

// Cancel booking
app.get("/bookings/:id/cancel", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  await BookingsService.cancel(db, id);
  return c.redirect("/admin");
});

export default app;
