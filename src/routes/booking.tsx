import { Hono } from "hono";
import * as EventTypesService from "../services/event-types.service";
import * as BookingsService from "../services/bookings.service";
import type { CustomField } from "../services/entities";
import { Layout } from "../components/Layout";
import { Calendar } from "../components/Calendar";
import { TimeSlots } from "../components/TimeSlots";
import { getAvailableDates, getAvailableSlots } from "../lib/availability";

const app = new Hono();

// Public booking page: /:slug
app.get("/:slug", (c) => {
  const slug = c.req.param("slug");
  const event = EventTypesService.findBySlug(slug);

  if (!event) {
    return c.html(
      <Layout title="Not Found">
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Event not found</h1>
            <a href="/admin" class="text-blue-600 hover:underline">Go to admin</a>
          </div>
        </div>
      </Layout>,
      404
    );
  }

  const now = new Date();
  const year = Number(c.req.query("year")) || now.getFullYear();
  const month = Number(c.req.query("month")) || now.getMonth() + 1;
  const selectedDate = c.req.query("date") ? Number(c.req.query("date")) : undefined;

  const availableDates = getAvailableDates(event.id, year, month);
  const baseUrl = `/${slug}`;

  let slots: { start: string; end: string }[] = [];
  let dateStr = "";
  if (selectedDate) {
    dateStr = `${year}-${String(month).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    slots = getAvailableSlots(event.id, dateStr, event.duration_minutes);
  }

  const selectedDateObj = selectedDate
    ? new Date(year, month - 1, selectedDate)
    : null;
  const dateLabel = selectedDateObj
    ? selectedDateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return c.html(
    <Layout title={`${event.name} - ${event.host_name}`}>
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="bg-white rounded-lg shadow-lg max-w-4xl w-full flex flex-col md:flex-row overflow-hidden border border-gray-200">
          {/* Left panel - Event info */}
          <div class="md:w-72 p-8 border-b md:border-b-0 md:border-r border-gray-200">
            <p class="text-sm text-gray-600 font-medium mb-1">{event.host_name}</p>
            <h1 class="text-xl font-bold text-gray-900 mb-4">{event.name}</h1>
            <div class="flex items-center text-gray-500 text-sm mb-3">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2" />
                <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
              </svg>
              {event.duration_minutes} min
            </div>
            {event.description && (
              <div class="flex items-start text-gray-500 text-sm">
                <svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="18" rx="2" stroke-width="2" />
                  <path d="M8 7h8M8 11h8M8 15h4" stroke-width="2" stroke-linecap="round" />
                </svg>
                {event.description}
              </div>
            )}
          </div>

          {/* Right panel - Calendar + Time slots */}
          <div class="flex-1 p-8">
            <h2 class="text-lg font-bold text-gray-900 mb-6">Select a Date & Time</h2>

            <div class="flex gap-8">
              <div class="flex-1">
                <Calendar
                  year={year}
                  month={month}
                  availableDates={availableDates}
                  selectedDate={selectedDate}
                  baseUrl={baseUrl}
                />
              </div>

              {selectedDate && (
                <div class="w-48">
                  <p class="text-sm font-medium text-gray-900 mb-3">{dateLabel}</p>
                  <TimeSlots
                    slots={slots}
                    date={dateStr}
                    bookingUrl={`/${slug}/book`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});

// Booking form page
app.get("/:slug/book", (c) => {
  const slug = c.req.param("slug");
  const date = c.req.query("date") || "";
  const time = c.req.query("time") || "";

  const event = EventTypesService.findBySlug(slug);
  if (!event) return c.redirect("/");

  const customFields: CustomField[] = JSON.parse(event.custom_fields || "[]");

  const [startH, startM] = time.split(":").map(Number);
  const endMinutes = startH * 60 + startM + event.duration_minutes;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

  const dateObj = new Date(date + "T00:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return c.html(
    <Layout title={`Book ${event.name}`}>
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="bg-white rounded-lg shadow-lg max-w-4xl w-full flex flex-col md:flex-row overflow-hidden border border-gray-200">
          {/* Left panel */}
          <div class="md:w-72 p-8 border-b md:border-b-0 md:border-r border-gray-200">
            <p class="text-sm text-gray-600 font-medium mb-1">{event.host_name}</p>
            <h1 class="text-xl font-bold text-gray-900 mb-4">{event.name}</h1>
            <div class="flex items-center text-gray-500 text-sm mb-3">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2" />
                <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
              </svg>
              {event.duration_minutes} min
            </div>
            <div class="flex items-center text-gray-500 text-sm mb-3">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
              </svg>
              {time} - {endTime}, {dateLabel}
            </div>
          </div>

          {/* Right panel - Form */}
          <div class="flex-1 p-8">
            <h2 class="text-lg font-bold text-gray-900 mb-6">Enter Details</h2>
            <form method="POST" action={`/${slug}/book`} class="space-y-4">
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="time" value={time} />

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please share anything that will help prepare for our meeting."
                />
              </div>

              {customFields.map((f) => (
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    {f.label}{f.required && " *"}
                  </label>
                  <input
                    type="text"
                    name={`cf_${f.key}`}
                    required={f.required}
                    class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={f.label}
                  />
                </div>
              ))}

              <div class="flex gap-3 pt-2">
                <button
                  type="submit"
                  class="bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Schedule Event
                </button>
                <a
                  href={`/${slug}?year=${dateObj.getFullYear()}&month=${dateObj.getMonth() + 1}&date=${dateObj.getDate()}`}
                  class="px-6 py-2.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  Back
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
});

// Handle booking submission
app.post("/:slug/book", async (c) => {
  const slug = c.req.param("slug");
  const event = EventTypesService.findBySlug(slug);
  if (!event) return c.redirect("/");

  const body = await c.req.parseBody();
  const date = body.date as string;
  const time = body.time as string;
  const name = body.name as string;
  const email = body.email as string;
  const notes = (body.notes as string) || "";

  // Collect custom field values
  const customFields: CustomField[] = JSON.parse(event.custom_fields || "[]");
  const customData: Record<string, string> = {};
  for (const f of customFields) {
    customData[f.key] = (body[`cf_${f.key}`] as string) || "";
  }

  const startTime = `${date}T${time}:00`;
  const [startH, startM] = time.split(":").map(Number);
  const endMinutes = startH * 60 + startM + event.duration_minutes;
  const endTimeStr = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  const endTime = `${date}T${endTimeStr}:00`;

  if (BookingsService.findConflict(event.id, startTime, endTime)) {
    return c.html(
      <Layout title="Time Unavailable">
        <div class="flex items-center justify-center min-h-screen">
          <div class="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <h1 class="text-xl font-bold text-red-600 mb-2">Time No Longer Available</h1>
            <p class="text-gray-600 mb-4">This time slot was just booked. Please select another time.</p>
            <a href={`/${slug}`} class="text-blue-600 hover:underline">Back to calendar</a>
          </div>
        </div>
      </Layout>
    );
  }

  BookingsService.create({
    event_type_id: event.id,
    invitee_name: name,
    invitee_email: email,
    start_time: startTime,
    end_time: endTime,
    notes,
    custom_data: JSON.stringify(customData),
  });

  return c.redirect(`/${slug}/confirmed?date=${date}&time=${time}&name=${encodeURIComponent(name)}`);
});

// Confirmation page
app.get("/:slug/confirmed", (c) => {
  const slug = c.req.param("slug");
  const event = EventTypesService.findBySlug(slug);
  if (!event) return c.redirect("/");

  const date = c.req.query("date") || "";
  const time = c.req.query("time") || "";
  const name = c.req.query("name") || "";

  const [startH, startM] = time.split(":").map(Number);
  const endMinutes = startH * 60 + startM + event.duration_minutes;
  const endTimeStr = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

  const dateObj = new Date(date + "T00:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return c.html(
    <Layout title="Booking Confirmed">
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center border border-gray-200">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">You are scheduled</h1>
          <p class="text-gray-500 mb-6">A calendar invitation has been sent to your email.</p>

          <div class="bg-gray-50 rounded-lg p-6 text-left space-y-3">
            <div>
              <p class="text-sm text-gray-500">What</p>
              <p class="font-medium text-gray-900">{event.name}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">When</p>
              <p class="font-medium text-gray-900">
                {time} - {endTimeStr}, {dateLabel}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Who</p>
              <p class="font-medium text-gray-900">
                {event.host_name} and {name}
              </p>
            </div>
          </div>

          <a
            href={`/${slug}`}
            class="inline-block mt-6 text-blue-600 hover:underline text-sm"
          >
            Schedule another meeting
          </a>
        </div>
      </div>
    </Layout>
  );
});

export default app;
