import { Hono } from "hono";
import type { Env } from "../../app";
import * as EventTypesService from "../../services/event-types.service";
import { Layout } from "../../components/Layout";
import { CustomFieldsEditor } from "../../components/CustomFieldsEditor";
import { AvailabilityEditor } from "../../components/AvailabilityEditor";
import type { CustomField } from "../../services/entities";
import { nestedBookings } from "./bookings";

const app = new Hono<Env>();

// Nested bookings: /admin/events/:eventId/bookings/*
app.route("/:eventId/bookings", nestedBookings);

// New event type form
app.get("/new", (c) => {
  return c.html(
    <Layout title="New Event Type">
      <div class="max-w-xl mx-auto p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Create Event Type</h1>
        <form method="post" action="/admin/events" class="space-y-4">
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
app.post("/", async (c) => {
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
app.get("/:id", async (c) => {
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
        <form method="post" action={`/admin/events/${id}`} class="space-y-4">
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

        <form method="post" action={`/admin/events/${id}/delete`} class="mt-8 pt-6 border-t border-gray-200">
          <button type="submit" class="text-red-500 text-sm hover:underline" onclick="return confirm('Delete this event type and all its bookings?')">
            Delete this event type
          </button>
        </form>
      </div>
    </Layout>
  );
});

// Update event type
app.post("/:id", async (c) => {
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

// Delete event type
app.post("/:id/delete", async (c) => {
  const db = c.get("db");
  const id = Number(c.req.param("id"));
  await EventTypesService.remove(db, id);
  return c.redirect("/admin");
});

export default app;
