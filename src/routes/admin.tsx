import { Hono } from "hono";
import * as EventTypesService from "../services/event-types.service";
import * as BookingsService from "../services/bookings.service";
import { Layout } from "../components/Layout";
import { CustomFieldsEditor } from "../components/CustomFieldsEditor";
import type { CustomField } from "../services/entities";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const app = new Hono();

// Admin dashboard
app.get("/", (c) => {
  const events = EventTypesService.listAll();
  const bookings = BookingsService.listRecent();

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
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h2>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Host Name *</label>
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

          <fieldset class="border border-gray-200 rounded-md p-4">
            <legend class="text-sm font-medium text-gray-700 px-1">Availability</legend>
            <p class="text-xs text-gray-500 mb-3">Select days and set hours</p>
            {DAYS.map((day, i) => (
              <div class="flex items-center gap-3 mb-2">
                <input type="checkbox" name={`day_${i}`} value="1" checked={i >= 0 && i <= 4} class="rounded" />
                <span class="w-24 text-sm">{day}</span>
                <input type="text" name={`start_${i}`} value="09:00" class="border border-gray-300 rounded px-2 py-1 text-sm w-20" />
                <span class="text-gray-400">-</span>
                <input type="text" name={`end_${i}`} value="17:00" class="border border-gray-300 rounded px-2 py-1 text-sm w-20" />
              </div>
            ))}
          </fieldset>

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
  const body = await c.req.parseBody();

  const eventTypeId = EventTypesService.create({
    slug: body.slug as string,
    name: body.name as string,
    host_name: body.host_name as string,
    duration_minutes: Number(body.duration),
    description: (body.description as string) || "",
    custom_fields: (body.custom_fields_json as string) || "[]",
    start_date: (body.start_date as string) || null,
    end_date: (body.end_date as string) || null,
  });

  const slots: { day_of_week: number; start_time: string; end_time: string }[] = [];
  for (let i = 0; i < 7; i++) {
    if (body[`day_${i}`]) {
      slots.push({
        day_of_week: i,
        start_time: body[`start_${i}`] as string,
        end_time: body[`end_${i}`] as string,
      });
    }
  }
  EventTypesService.replaceAvailability(eventTypeId, slots);

  return c.redirect("/admin");
});

// Edit event type
app.get("/events/:id", (c) => {
  const id = Number(c.req.param("id"));
  const event = EventTypesService.findById(id);
  if (!event) return c.redirect("/admin");

  const avails = EventTypesService.getAvailability(id);
  const availMap = new Map(avails.map((a) => [a.day_of_week, a]));

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
            <label class="block text-sm font-medium text-gray-700 mb-1">Host Name</label>
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

          <fieldset class="border border-gray-200 rounded-md p-4">
            <legend class="text-sm font-medium text-gray-700 px-1">Availability</legend>
            {DAYS.map((day, i) => {
              const a = availMap.get(i);
              return (
                <div class="flex items-center gap-3 mb-2">
                  <input type="checkbox" name={`day_${i}`} value="1" checked={!!a} class="rounded" />
                  <span class="w-24 text-sm">{day}</span>
                  <input type="text" name={`start_${i}`} value={a?.start_time || "09:00"} class="border border-gray-300 rounded px-2 py-1 text-sm w-20" />
                  <span class="text-gray-400">-</span>
                  <input type="text" name={`end_${i}`} value={a?.end_time || "17:00"} class="border border-gray-300 rounded px-2 py-1 text-sm w-20" />
                </div>
              );
            })}
          </fieldset>

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
  const id = Number(c.req.param("id"));
  const body = await c.req.parseBody();

  EventTypesService.update(id, {
    slug: body.slug as string,
    name: body.name as string,
    host_name: body.host_name as string,
    duration_minutes: Number(body.duration),
    description: (body.description as string) || "",
    custom_fields: (body.custom_fields_json as string) || "[]",
    start_date: (body.start_date as string) || null,
    end_date: (body.end_date as string) || null,
  });

  const slots: { day_of_week: number; start_time: string; end_time: string }[] = [];
  for (let i = 0; i < 7; i++) {
    if (body[`day_${i}`]) {
      slots.push({
        day_of_week: i,
        start_time: body[`start_${i}`] as string,
        end_time: body[`end_${i}`] as string,
      });
    }
  }
  EventTypesService.replaceAvailability(id, slots);

  return c.redirect("/admin");
});

// Delete event type
app.post("/events/:id/delete", (c) => {
  const id = Number(c.req.param("id"));
  EventTypesService.remove(id);
  return c.redirect("/admin");
});

// Cancel booking
app.get("/bookings/:id/cancel", (c) => {
  const id = Number(c.req.param("id"));
  BookingsService.cancel(id);
  return c.redirect("/admin");
});

export default app;
