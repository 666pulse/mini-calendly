import { Hono } from "hono";
import { type Env, getEnvVar } from "../app";
import * as EventTypesService from "../services/event-types.service";
import * as BookingsService from "../services/bookings.service";
import * as TencentMeetingService from "../services/tencent-meeting.service";
import type { CustomField } from "../services/entities";
import { Layout } from "../components/Layout";
import { Calendar } from "../components/Calendar";
import { TimeSlots } from "../components/TimeSlots";
import { getAvailableDates, getAvailableSlots } from "../lib/availability";

const app = new Hono<Env>();

// Public booking page: /:slug
app.get("/:slug", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");
  const event = await EventTypesService.findBySlug(db, slug);

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

  const availableDates = await getAvailableDates(db, event.id, year, month, event.start_date, event.end_date);
  const baseUrl = `/${slug}`;

  let slots: { start: string; end: string }[] = [];
  let dateStr = "";
  if (selectedDate) {
    dateStr = `${year}-${String(month).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    slots = await getAvailableSlots(db, event.id, dateStr, event.duration_minutes);
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
            {event.meeting_url && (
              <div class="flex items-center text-gray-500 text-sm">
                <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Web conferencing details provided upon confirmation.
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
app.get("/:slug/book", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");
  const date = c.req.query("date") || "";
  const time = c.req.query("time") || "";

  const event = await EventTypesService.findBySlug(db, slug);
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
            <form method="post" action={`/${slug}/book`} class="space-y-4">
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
                  id="submit-btn"
                  class="bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onclick="this.disabled=true;this.textContent='Scheduling...';this.form.submit()"
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
  const db = c.get("db");
  const slug = c.req.param("slug");
  const event = await EventTypesService.findBySlug(db, slug);
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

  if (await BookingsService.findConflict(db, event.id, startTime, endTime)) {
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

  // Create meeting if provider is configured
  let meetingId = "";
  let meetingCode = "";
  let meetingUrl = "";

  if (event.meeting_provider === "tencent") {
    const token = getEnvVar(c, "TENCENT_MEETING_TOKEN");
    if (token) {
      const isoStart = `${date}T${time}:00+08:00`;
      const isoEnd = `${date}T${endTimeStr}:00+08:00`;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const meeting = await TencentMeetingService.createMeeting(
            token,
            `${event.name} - ${name}`,
            isoStart,
            isoEnd
          );
          meetingId = meeting.meeting_id;
          meetingCode = meeting.meeting_code;
          meetingUrl = meeting.join_url;
          break;
        } catch (e) {
          console.error(`Tencent Meeting attempt ${attempt}/3 failed:`, e);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  } else if (event.meeting_provider === "static" && event.meeting_url) {
    meetingUrl = event.meeting_url;
  }

  const { cancel_token } = await BookingsService.create(db, {
    event_type_id: event.id,
    invitee_name: name,
    invitee_email: email,
    start_time: startTime,
    end_time: endTime,
    notes,
    custom_data: JSON.stringify(customData),
    meeting_id: meetingId,
    meeting_code: meetingCode,
    meeting_url: meetingUrl,
  });

  const meetingFailed = event.meeting_provider === "tencent" && !meetingUrl ? "1" : "";
  return c.redirect(`/${slug}/confirmed?date=${date}&time=${time}&name=${encodeURIComponent(name)}&token=${cancel_token}&mf=${meetingFailed}`);
});

// Confirmation page
app.get("/:slug/confirmed", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");
  const event = await EventTypesService.findBySlug(db, slug);
  if (!event) return c.redirect("/");

  const date = c.req.query("date") || "";
  const time = c.req.query("time") || "";
  const name = c.req.query("name") || "";
  const token = c.req.query("token") || "";
  const meetingFailed = c.req.query("mf") === "1";

  // Look up the booking to get meeting URL
  const startTimeISO = `${date}T${time}:00`;
  const latestBooking = await db.get<{ meeting_url: string }>(
    "SELECT meeting_url FROM bookings WHERE event_type_id = ? AND start_time = ? ORDER BY id DESC LIMIT 1",
    [event.id, startTimeISO]
  );
  const bookingMeetingUrl = latestBooking?.meeting_url || event.meeting_url || "";
  const manageUrl = token ? `/${slug}/manage/${token}` : "";

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
            <svg
              class="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 13l4 4L19 7"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            You are scheduled
          </h1>
          <p class="text-gray-500 mb-6">
            A calendar invitation has been sent to your email.
          </p>

          {meetingFailed && (
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-left">
              <p class="text-sm text-yellow-800">
                Meeting link could not be generated. The host will share the
                meeting details with you separately.
              </p>
            </div>
          )}

          <div class="bg-gray-50 rounded-lg p-6 text-left space-y-4">
            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                  stroke-width="2"
                />
                <path
                  d="M16 2v4M8 2v4M3 10h18"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide">
                  What
                </p>
                <p class="font-medium text-gray-900">{event.name}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" stroke-width="2" />
                <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
              </svg>
              <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide">
                  When
                </p>
                <p class="font-medium text-gray-900">
                  {time} - {endTimeStr}, {dateLabel}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <circle cx="12" cy="7" r="4" stroke-width="2" />
              </svg>
              <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide">Who</p>
                <p class="font-medium text-gray-900">
                  {event.host_name} and {name}
                </p>
              </div>
            </div>
            {bookingMeetingUrl && (
              <div class="flex items-start gap-3">
                <svg
                  class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wide">
                    Where
                  </p>
                  <a
                    href={bookingMeetingUrl}
                    target="_blank"
                    class="inline-flex items-center gap-1.5 mt-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    Join Meeting
                  </a>
                </div>
              </div>
            )}
          </div>

          <div class="mt-6 space-y-2">
            {manageUrl && (
              <p class="text-sm">
                <a
                  href={manageUrl}
                  class="text-blue-600 font-medium hover:underline"
                >
                  Manage your booking
                </a>
              </p>
            )}
            <a
              href={`/${slug}`}
              class="inline-block text-blue-600 hover:underline text-sm"
            >
              Schedule another meeting
            </a>
          </div>
        </div>
      </div>
    </Layout>,
  );
});

// Public manage booking page
app.get("/:slug/manage/:token", async (c) => {
  const db = c.get("db");
  const token = c.req.param("token");
  const b = await BookingsService.findByToken(db, token);

  if (!b) {
    return c.html(
      <Layout title="Booking Not Found">
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Booking not found</h1>
            <p class="text-gray-500">This link may have expired or is invalid.</p>
          </div>
        </div>
      </Layout>,
      404
    );
  }

  const dateObj = new Date(b.start_time);
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const startTime = b.start_time.split("T")[1]?.replace(":00", "") || "";
  const endTime = b.end_time.split("T")[1]?.replace(":00", "") || "";

  return c.html(
    <Layout title="Manage Booking">
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center border border-gray-200">
          {/* Status badge */}
          <div class={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            b.status === "confirmed" ? "bg-green-100" : "bg-red-100"
          }`}>
            {b.status === "confirmed" ? (
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            ) : (
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
              </svg>
            )}
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-1">Your Booking</h1>
          <span
            class={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 ${
              b.status === "confirmed"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {b.status}
          </span>

          <div class="bg-gray-50 rounded-lg p-6 text-left space-y-4">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
              </svg>
              <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide">What</p>
                <p class="font-medium text-gray-900">{b.event_name}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2" />
                <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
              </svg>
              <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide">When</p>
                <p class="font-medium text-gray-900">{startTime} - {endTime}, {dateLabel}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round" />
                <circle cx="12" cy="7" r="4" stroke-width="2" />
              </svg>
              <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide">Who</p>
                <p class="font-medium text-gray-900">{(b as any).host_name} and {b.invitee_name}</p>
              </div>
            </div>
            {b.meeting_url && (
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wide">Where</p>
                  <a
                    href={b.meeting_url}
                    target="_blank"
                    class="inline-flex items-center gap-1.5 mt-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Join Meeting
                  </a>
                </div>
              </div>
            )}
          </div>

          {b.status === "confirmed" && (
            <div class="mt-6">
              <button
                class="text-red-500 text-sm hover:underline"
                onclick="document.getElementById('cancel-dialog').showModal()"
              >
                Cancel this booking
              </button>

              <dialog id="cancel-dialog" class="rounded-lg shadow-xl p-0 backdrop:bg-black/30">
                <form method="POST" action={`/${(b as any).slug}/manage/${token}/cancel`} class="p-6 w-96">
                  <h3 class="font-semibold text-gray-900 mb-3">Cancel Booking</h3>
                  <textarea name="reason" rows={3} placeholder="Reason for cancellation (optional)" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4" />
                  <div class="flex gap-2 justify-end">
                    <button type="button" class="px-3 py-1.5 text-sm text-gray-600" onclick="document.getElementById('cancel-dialog').close()">Back</button>
                    <button type="submit" class="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700">Confirm Cancel</button>
                  </div>
                </form>
              </dialog>
            </div>
          )}

          {b.status === "cancelled" && b.cancel_reason && (
            <div class="mt-6 bg-red-50 border border-red-100 rounded-lg p-4 text-left">
              <p class="text-sm text-red-600 font-medium mb-1">Cancellation reason</p>
              <p class="text-sm text-gray-600">{b.cancel_reason}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
});

// Public cancel booking
app.post("/:slug/manage/:token/cancel", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");
  const token = c.req.param("token");
  const b = await BookingsService.findByToken(db, token);

  if (!b || b.status !== "confirmed") {
    return c.redirect(`/${slug}`);
  }

  const body = await c.req.parseBody();
  const reason = (body.reason as string) || "Cancelled by invitee";

  // Cancel Tencent Meeting if applicable
  if (b.meeting_id) {
    const meetingToken = getEnvVar(c, "TENCENT_MEETING_TOKEN");
    if (meetingToken) {
      try {
        await TencentMeetingService.cancelMeeting(meetingToken, b.meeting_id);
      } catch (e) {
        console.error("Failed to cancel Tencent Meeting:", e);
      }
    }
  }

  await BookingsService.cancel(db, b.id, reason);
  return c.redirect(`/${slug}/manage/${token}`);
});

export default app;
