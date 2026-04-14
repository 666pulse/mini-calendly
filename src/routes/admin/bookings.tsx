import { Hono } from "hono";
import type { Env } from "../../app";
import * as EventTypesService from "../../services/event-types.service";
import * as BookingsService from "../../services/bookings.service";
import { Layout } from "../../components/Layout";
import type { CustomField } from "../../services/entities";

// URL helpers
function bookingUrl(eventId: number, bookingId: number) {
  return `/admin/events/${eventId}/bookings/${bookingId}`;
}

function cancelUrl(eventId: number, bookingId: number) {
  return `/admin/events/${eventId}/bookings/${bookingId}/cancel`;
}

function confirmUrl(eventId: number, bookingId: number) {
  return `/admin/events/${eventId}/bookings/${bookingId}/confirm`;
}

function listUrl(eventId?: number) {
  return eventId ? `/admin/events/${eventId}/bookings` : "/admin/bookings";
}

// Shared bookings list renderer
async function renderBookingsList(c: any, eventId?: number) {
  const db = c.get("db");
  const events = await EventTypesService.listAll(db);
  const event = eventId ? await EventTypesService.findById(db, eventId) : null;

  const status = c.req.query("status") || undefined;
  const search = c.req.query("search") || undefined;
  const page = Number(c.req.query("page")) || 1;

  const result = await BookingsService.list(db, {
    event_type_id: eventId,
    status,
    search,
    page,
  });

  const baseUrl = listUrl(eventId);
  const buildUrl = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const values = { status, search, page, ...overrides };
    for (const [k, v] of Object.entries(values)) {
      if (v !== undefined && v !== "") params.set(k, String(v));
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const title = event ? `Bookings - ${event.name}` : "All Bookings";
  const backUrl = event ? `/admin/events/${event.id}` : "/admin";
  const backLabel = event ? `Back to ${event.name}` : "Back to dashboard";

  return c.html(
    <Layout title={`${title} - Admin`}>
      <div class="max-w-5xl mx-auto p-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-gray-900">{title}</h1>
          <a href={backUrl} class="text-gray-500 text-sm hover:text-gray-700">{backLabel}</a>
        </div>

        {/* Filters */}
        <form method="get" action={baseUrl} class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div class="flex flex-wrap gap-3 items-end">
            {!eventId && (
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Event</label>
                <select name="event" class="border border-gray-300 rounded-md px-3 py-1.5 text-sm" onchange="this.form.action='/admin/events/'+this.value+'/bookings'; if(!this.value) this.form.action='/admin/bookings'; this.form.submit()">
                  <option value="">All events</option>
                  {events.map((e) => (
                    <option value={String(e.id)}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}
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
            <a href={baseUrl} class="text-gray-400 text-sm hover:text-gray-600 py-1.5">Clear</a>
          </div>
        </form>

        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-gray-500">{result.total} bookings found</span>
          {eventId && (
            <form method="post" action={`/admin/events/${eventId}/bookings/export.csv`}>
              <input type="hidden" name="status" value={status || ""} />
              <input type="hidden" name="search" value={search || ""} />
              <button type="submit" class="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50">
                Export CSV
              </button>
            </form>
          )}
        </div>

        {result.rows.length === 0 ? (
          <p class="text-gray-500">No bookings match your filters.</p>
        ) : (
          <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-200">
                <tr>
                  {!eventId && <th class="text-left px-4 py-3 font-medium text-gray-600">Event</th>}
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Invitee</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((b) => (
                  <tr class="border-b border-gray-100">
                    {!eventId && <td class="px-4 py-3">{b.event_name}</td>}
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
                      <a href={bookingUrl(b.event_type_id, b.id)} class="text-blue-600 hover:underline text-xs">
                        View
                      </a>
                      {b.status === "confirmed" && (
                        <button
                          class="text-red-500 hover:underline text-xs"
                          onclick={`document.getElementById('cancel-modal-${b.id}').showModal()`}
                        >
                          Cancel
                        </button>
                      )}
                      {b.status === "cancelled" && (
                        <a href={confirmUrl(b.event_type_id, b.id)} class="text-green-600 hover:underline text-xs">
                          Confirm
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cancel dialogs */}
        {result.rows.filter((b) => b.status === "confirmed").map((b) => (
          <dialog id={`cancel-modal-${b.id}`} class="rounded-lg shadow-xl p-0 backdrop:bg-black/30">
            <form method="post" action={cancelUrl(b.event_type_id, b.id)} class="p-6 w-80">
              <h3 class="font-semibold text-gray-900 mb-3">Cancel Booking</h3>
              <textarea name="reason" required rows={3} placeholder="Cancel reason..." class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4" />
              <div class="flex gap-2 justify-end">
                <button type="button" class="px-3 py-1.5 text-sm text-gray-600" onclick={`document.getElementById('cancel-modal-${b.id}').close()`}>Back</button>
                <button type="submit" class="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700">Confirm</button>
              </div>
            </form>
          </dialog>
        ))}

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
}

// Shared booking detail renderer
async function renderBookingDetail(c: any, eventId: number, bookingId: number) {
  const db = c.get("db");
  const b = await BookingsService.findById(db, bookingId);
  if (!b) return c.redirect(listUrl(eventId));

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
          <a href={listUrl(eventId)} class="text-gray-500 text-sm hover:text-gray-700">Back to list</a>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
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
              <button
                class="text-red-500 text-sm hover:underline"
                onclick="document.getElementById('cancel-modal-detail').showModal()"
              >
                Cancel booking
              </button>
            )}
            {b.status === "cancelled" && (
              <a href={confirmUrl(eventId, b.id)} class="text-green-600 text-sm hover:underline">
                Re-confirm booking
              </a>
            )}
          </div>

          <div class="border-b border-gray-100 pb-4">
            <h2 class="text-sm font-medium text-gray-500 mb-2">Event</h2>
            <p class="font-semibold text-gray-900">{b.event_name}</p>
            <p class="text-sm text-gray-500">{(b as any).host_name} &middot; {(b as any).duration_minutes} min</p>
          </div>

          <div class="border-b border-gray-100 pb-4">
            <h2 class="text-sm font-medium text-gray-500 mb-2">When</h2>
            <p class="text-gray-900">{dateLabel}</p>
            <p class="text-gray-900">{startTime} - {endTime}</p>
            <p class="text-sm text-gray-400 mt-1">{b.timezone}</p>
          </div>

          <div class="border-b border-gray-100 pb-4">
            <h2 class="text-sm font-medium text-gray-500 mb-2">Invitee</h2>
            <p class="text-gray-900">{b.invitee_name}</p>
            <p class="text-sm text-gray-500">{b.invitee_email}</p>
          </div>

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

          {b.notes && (
            <div class="border-b border-gray-100 pb-4">
              <h2 class="text-sm font-medium text-gray-500 mb-2">Notes</h2>
              <p class="text-sm text-gray-900 whitespace-pre-wrap">{b.notes}</p>
            </div>
          )}

          {b.cancel_reason && (
            <div class="border-b border-gray-100 pb-4">
              <h2 class="text-sm font-medium text-red-500 mb-2">Cancel Reason</h2>
              <p class="text-sm text-gray-900 whitespace-pre-wrap">{b.cancel_reason}</p>
            </div>
          )}

          <div>
            <h2 class="text-sm font-medium text-gray-500 mb-2">Meta</h2>
            <div class="text-sm text-gray-400 space-y-0.5">
              <p>Booking ID: {b.id}</p>
              <p>Created: {b.created_at}</p>
            </div>
          </div>
        </div>

        <dialog id="cancel-modal-detail" class="rounded-lg shadow-xl p-0 backdrop:bg-black/30">
          <form method="post" action={cancelUrl(eventId, b.id)} class="p-6 w-96">
            <h3 class="font-semibold text-gray-900 mb-3">Cancel Booking</h3>
            <p class="text-sm text-gray-500 mb-3">{b.event_name} &middot; {b.invitee_name}</p>
            <textarea name="reason" required rows={3} placeholder="Cancel reason..." class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4" />
            <div class="flex gap-2 justify-end">
              <button type="button" class="px-3 py-1.5 text-sm text-gray-600" onclick="document.getElementById('cancel-modal-detail').close()">Back</button>
              <button type="submit" class="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700">Confirm</button>
            </div>
          </form>
        </dialog>
      </div>
    </Layout>
  );
}

const app = new Hono<Env>();

// GET /admin/bookings — all bookings
app.get("/", async (c) => renderBookingsList(c));

// GET /admin/bookings/:id — legacy redirect to REST URL
app.get("/:id/detail", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const b = await BookingsService.findById(db, id);
  if (!b) return c.redirect("/admin/bookings");
  return c.redirect(bookingUrl(b.event_type_id, b.id));
});

export default app;

// Nested under /admin/events/:eventId/bookings
export const nestedBookings = new Hono<Env>();

// GET /admin/events/:eventId/bookings
nestedBookings.get("/", async (c) => {
  const eventId = Number(c.req.param("eventId"));
  return renderBookingsList(c, eventId);
});

// POST /admin/events/:eventId/bookings/export.csv
nestedBookings.post("/export.csv", async (c) => {
  const db = c.get("db");
  const eventId = Number(c.req.param("eventId"));
  const event = await EventTypesService.findById(db, eventId);
  if (!event) return c.text("Event not found", 404);

  const body = await c.req.parseBody();
  const status = (body.status as string) || undefined;
  const search = (body.search as string) || undefined;

  const result = await BookingsService.list(db, {
    event_type_id: eventId,
    status,
    search,
    page: 1,
    pageSize: 1000,
  });

  const customFields: CustomField[] = JSON.parse(event.custom_fields || "[]");

  // CSV header
  const headers = ["ID", "Name", "Email", "Date", "Start", "End", "Status", "Notes", "Cancel Reason"];
  for (const f of customFields) {
    headers.push(f.label);
  }
  headers.push("Created At");

  // CSV rows
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = [headers.map(escape).join(",")];
  for (const b of result.rows) {
    const date = b.start_time.split("T")[0] || "";
    const start = b.start_time.split("T")[1]?.replace(":00", "") || "";
    const end = b.end_time.split("T")[1]?.replace(":00", "") || "";
    const customData: Record<string, string> = JSON.parse(b.custom_data || "{}");

    const row = [
      String(b.id),
      b.invitee_name,
      b.invitee_email,
      date,
      start,
      end,
      b.status,
      b.notes || "",
      b.cancel_reason || "",
    ];
    for (const f of customFields) {
      row.push(customData[f.key] || "");
    }
    row.push(b.created_at || "");
    lines.push(row.map(escape).join(","));
  }

  const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel
  const filename = `bookings-${event.slug}-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// GET /admin/events/:eventId/bookings/:id
nestedBookings.get("/:id", async (c) => {
  const eventId = Number(c.req.param("eventId"));
  const id = Number(c.req.param("id"));
  return renderBookingDetail(c, eventId, id);
});

// POST /admin/events/:eventId/bookings/:id/cancel
nestedBookings.post("/:id/cancel", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  const body = await c.req.parseBody();
  const reason = (body.reason as string) || "";
  await BookingsService.cancel(db, id, reason);
  return c.redirect(c.req.header("Referer") || "/admin");
});

// GET /admin/events/:eventId/bookings/:id/confirm
nestedBookings.get("/:id/confirm", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  await BookingsService.confirm(db, id);
  return c.redirect(c.req.header("Referer") || "/admin");
});
