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
// Shared form values type
interface FormValues {
  name?: string;
  slug?: string;
  host_name?: string;
  duration?: string;
  description?: string;
  meeting_provider?: string;
  meeting_url?: string;
  published?: string;
  start_date?: string;
  end_date?: string;
}

const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";

function NewEventForm({ error, values: v }: { error?: string; values?: FormValues }) {
  const mp = v?.meeting_provider || "none";
  return (
    <Layout title="New Event Type">
      <div class="max-w-xl mx-auto p-6">
        <h1 class="text-2xl font-bold text-slate-900 mb-6">Create Event Type</h1>

        {error && (
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form method="post" action="/admin/events" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Event Name *</label>
            <input type="text" name="name" required value={v?.name || ""} class={inputCls} placeholder="e.g. 30 Minute Meeting" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">URL Slug *</label>
            <input type="text" name="slug" required value={v?.slug || ""} class={inputCls} placeholder="e.g. 30min-meeting" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Host *</label>
            <input type="text" name="host_name" required value={v?.host_name || ""} class={inputCls} placeholder="Your name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Duration (minutes) *</label>
            <input type="number" name="duration" required value={v?.duration || "30"} class={inputCls} />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Description</label>
            <textarea name="description" rows={2} class={inputCls}>{v?.description || ""}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Meeting Provider</label>
            <select name="meeting_provider" class={inputCls} id="meeting-provider-new" onchange="document.getElementById('meeting-url-row-new').style.display = this.value === 'static' ? '' : 'none'">
              <option value="none" selected={mp === "none"}>None</option>
              <option value="google" selected={mp === "google"}>Google Meet (auto-create)</option>
              <option value="tencent" selected={mp === "tencent"}>Tencent Meeting (auto-create)</option>
              <option value="static" selected={mp === "static"}>Static URL (Zoom, etc.)</option>
            </select>
          </div>
          <div id="meeting-url-row-new" style={mp === "static" ? "" : "display:none"}>
            <label class="block text-sm font-medium text-slate-600 mb-1">Meeting URL</label>
            <input type="url" name="meeting_url" value={v?.meeting_url || ""} class={inputCls} placeholder="https://meet.google.com/xxx-xxx-xxx" />
          </div>

          <div>
            <label class="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="published" value="1" checked={v?.published !== "0"} class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span class="text-sm font-medium text-slate-600">Published</span>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">Start Date</label>
              <input type="date" name="start_date" value={v?.start_date || ""} class={inputCls} />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">End Date</label>
              <input type="date" name="end_date" value={v?.end_date || ""} class={inputCls} />
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
            <button type="submit" class="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm">
              Create
            </button>
            <a href="/admin" class="px-6 py-2 text-sm text-slate-500 hover:text-slate-900">Cancel</a>
          </div>
        </form>
      </div>
    </Layout>
  );
}

app.get("/new", (c) => {
  return c.html(<NewEventForm />);
});

// Create event type
app.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.parseBody();
  const slug = body.slug as string;

  const formValues: FormValues = {
    name: body.name as string,
    slug,
    host_name: body.host_name as string,
    duration: (body.duration as string) || "30",
    description: (body.description as string) || "",
    meeting_provider: (body.meeting_provider as string) || "none",
    meeting_url: (body.meeting_url as string) || "",
    published: body.published === "1" ? "1" : "0",
    start_date: (body.start_date as string) || "",
    end_date: (body.end_date as string) || "",
  };

  // Check slug uniqueness
  const existing = await EventTypesService.findBySlug(db, slug);
  if (existing) {
    return c.html(
      <NewEventForm error={`URL Slug "${slug}" 已被使用，请换一个。`} values={formValues} />,
      409
    );
  }

  const eventTypeId = await EventTypesService.create(db, {
    slug,
    name: body.name as string,
    host_name: body.host_name as string,
    duration_minutes: Number(body.duration),
    description: (body.description as string) || "",
    custom_fields: (body.custom_fields_json as string) || "[]",
    meeting_provider: (body.meeting_provider as string) || "none",
    meeting_url: (body.meeting_url as string) || "",
    published: body.published === "1" ? 1 : 0,
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
        <h1 class="text-2xl font-bold text-slate-900 mb-6">Edit Event Type</h1>
        <form method="post" action={`/admin/events/${id}`} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Event Name</label>
            <input type="text" name="name" required value={event.name} class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">URL Slug</label>
            <input type="text" value={event.slug} readonly disabled class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 bg-slate-50 cursor-not-allowed" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Host</label>
            <input type="text" name="host_name" required value={event.host_name} class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Duration (minutes)</label>
            <input type="number" name="duration" required value={String(event.duration_minutes)} class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Description</label>
            <textarea name="description" rows={2} class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">{event.description}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Meeting Provider</label>
            <select name="meeting_provider" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" id="meeting-provider-edit" onchange="document.getElementById('meeting-url-row-edit').style.display = this.value === 'static' ? '' : 'none'">
              <option value="none" selected={event.meeting_provider === "none" || !event.meeting_provider}>None</option>
              <option value="google" selected={event.meeting_provider === "google"}>Google Meet (auto-create)</option>
              <option value="tencent" selected={event.meeting_provider === "tencent"}>Tencent Meeting (auto-create)</option>
              <option value="static" selected={event.meeting_provider === "static"}>Static URL (Zoom, etc.)</option>
            </select>
          </div>
          <div id="meeting-url-row-edit" style={event.meeting_provider === "static" ? "" : "display:none"}>
            <label class="block text-sm font-medium text-slate-600 mb-1">Meeting URL</label>
            <input type="url" name="meeting_url" value={event.meeting_url || ""} class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" placeholder="https://meet.google.com/xxx-xxx-xxx" />
          </div>

          <div>
            <label class="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="published" value="1" checked={event.published === 1} class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span class="text-sm font-medium text-slate-600">Published</span>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">Start Date</label>
              <input type="date" name="start_date" value={event.start_date || ""} class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">End Date</label>
              <input type="date" name="end_date" value={event.end_date || ""} class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
            </div>
          </div>

          <AvailabilityEditor data={availData} />

          <CustomFieldsEditor fields={JSON.parse(event.custom_fields || "[]") as CustomField[]} />

          <div class="flex gap-3 pt-2">
            <button type="submit" class="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all duration-200 shadow-sm">
              Save Changes
            </button>
            <a href="/admin" class="px-6 py-2 text-sm text-slate-500 hover:text-slate-900">Cancel</a>
          </div>
        </form>

        <form method="post" action={`/admin/events/${id}/delete`} class="mt-8 pt-6 border-t border-slate-200">
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
    name: body.name as string,
    host_name: body.host_name as string,
    duration_minutes: Number(body.duration),
    description: (body.description as string) || "",
    custom_fields: (body.custom_fields_json as string) || "[]",
    meeting_provider: (body.meeting_provider as string) || "none",
    meeting_url: (body.meeting_url as string) || "",
    published: body.published === "1" ? 1 : 0,
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
