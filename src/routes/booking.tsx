import { Hono } from "hono";
import { type Env, getEnvVar } from "../app";
import * as EventTypesService from "../services/event-types.service";
import * as BookingsService from "../services/bookings.service";
import * as TencentMeetingService from "../services/tencent-meeting.service";
import * as GoogleMeetService from "../services/google-meet.service";
import type { CustomField } from "../services/entities";
import { Layout } from "../components/Layout";
import { MeetingIcon, MeetingButton } from "../components/MeetingBrand";
import { Calendar } from "../components/Calendar";
import { TimeSlots } from "../components/TimeSlots";
import { getAvailableDates, getAvailableSlots, DEFAULT_TZ } from "../lib/availability";

const app = new Hono<Env>();

// Shared header component
function BookingHeader({ title }: { title?: string }) {
  return (
    <header class="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
              <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
            </svg>
          </div>
          <span class="text-base font-semibold text-slate-900 tracking-tight">Mini Calendly</span>
        </a>
        {title && (
          <span class="text-sm text-slate-400 hidden md:block">{title}</span>
        )}
      </div>
    </header>
  );
}

// Shared footer
function BookingFooter() {
  return (
    <footer class="border-t border-slate-200/60 bg-white/50">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-center">
        <span class="text-xs text-slate-400">
          由 <span class="font-medium text-slate-500">Mini Calendly</span> 提供服务
        </span>
      </div>
    </footer>
  );
}

// Public booking page: /:slug
app.get("/:slug", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");
  const event = await EventTypesService.findBySlug(db, slug);

  if (!event || !event.published) {
    return c.html(
      <Layout title="Not Found">
        <BookingHeader />
        <div class="flex items-center justify-center flex-1 min-h-[70vh]">
          <div class="text-center">
            <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" stroke-width="2" stroke-linecap="round" />
              </svg>
            </div>
            <h1 class="text-xl font-bold text-slate-900 mb-2">未找到活动</h1>
            <p class="text-sm text-slate-500 mb-4">该活动可能已被移除或链接有误。</p>
            <a href="/" class="text-indigo-600 text-sm font-medium hover:underline">浏览所有活动</a>
          </div>
        </div>
      </Layout>,
      404
    );
  }

  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const year = Number(c.req.query("year")) || now.getUTCFullYear();
  const month = Number(c.req.query("month")) || now.getUTCMonth() + 1;
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
    ? selectedDateObj.toLocaleDateString("zh-CN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: DEFAULT_TZ,
      })
    : null;

  return c.html(
    <Layout title={`${event.name} - ${event.host_name}`}>
      <div class="flex flex-col min-h-screen">
        <BookingHeader title={event.host_name} />

        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/50 max-w-4xl w-full flex flex-col md:flex-row overflow-hidden border border-slate-200/80">
            {/* Left panel - Event info */}
            <div class="md:w-72 p-8 border-b md:border-b-0 md:border-r border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={`background: ${event.color}15`}>
                <svg class="w-5 h-5" style={`color: ${event.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <p class="text-sm text-slate-500 font-medium mb-1">{event.host_name}</p>
              <h1 class="text-xl font-bold text-slate-900 mb-5">{event.name}</h1>

              <div class="space-y-3">
                <div class="flex items-center text-slate-500 text-sm">
                  <svg class="w-4 h-4 mr-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                    <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
                  </svg>
                  {event.duration_minutes} 分钟
                </div>
                {event.description && (
                  <div class="flex items-start text-slate-500 text-sm">
                    <svg class="w-4 h-4 mr-2.5 mt-0.5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="2" y="3" width="20" height="18" rx="2" stroke-width="2" />
                      <path d="M8 7h8M8 11h8M8 15h4" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    <span class="leading-relaxed">{event.description}</span>
                  </div>
                )}
                {event.meeting_url && (
                  <div class="flex items-center text-slate-500 text-sm">
                    <svg class="w-4 h-4 mr-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    确认后将提供视频会议信息。
                  </div>
                )}
              </div>
            </div>

            {/* Right panel - Calendar + Time slots */}
            <div class="flex-1 p-8">
              <h2 class="text-lg font-bold text-slate-900 mb-6">选择日期和时间</h2>

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
                    <p class="text-sm font-medium text-slate-900 mb-3">{dateLabel}</p>
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

        <BookingFooter />
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
  if (!event || !event.published) return c.redirect("/");

  const customFields: CustomField[] = JSON.parse(event.custom_fields || "[]");

  const [startH, startM] = time.split(":").map(Number);
  const endMinutes = startH * 60 + startM + event.duration_minutes;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

  const dateObj = new Date(date + "T00:00:00");
  const dateLabel = dateObj.toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: DEFAULT_TZ,
  });

  return c.html(
    <Layout title={`Book ${event.name}`}>
      <div class="flex flex-col min-h-screen">
        <BookingHeader title="确认预约信息" />

        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/50 max-w-4xl w-full flex flex-col md:flex-row overflow-hidden border border-slate-200/80">
            {/* Left panel */}
            <div class="md:w-72 p-8 border-b md:border-b-0 md:border-r border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={`background: ${event.color}15`}>
                <svg class="w-5 h-5" style={`color: ${event.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <p class="text-sm text-slate-500 font-medium mb-1">{event.host_name}</p>
              <h1 class="text-xl font-bold text-slate-900 mb-5">{event.name}</h1>

              <div class="space-y-3">
                <div class="flex items-center text-slate-500 text-sm">
                  <svg class="w-4 h-4 mr-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                    <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
                  </svg>
                  {event.duration_minutes} min
                </div>
                <div class="flex items-center text-slate-500 text-sm">
                  <svg class="w-4 h-4 mr-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                  </svg>
                  {time} - {endTime}, {dateLabel}
                </div>
              </div>
            </div>

            {/* Right panel - Form */}
            <div class="flex-1 p-8">
              <h2 class="text-lg font-bold text-slate-900 mb-6">填写信息</h2>
              <form method="post" action={`/${slug}/book`} class="space-y-4">
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="time" value={time} />

                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">姓名 *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="你的姓名"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">邮箱 *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">备注</label>
                  <textarea
                    name="notes"
                    rows={3}
                    class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="请分享任何有助于会议准备的信息。"
                  />
                </div>

                {customFields.map((f) => (
                  <div>
                    <label class="block text-sm font-medium text-slate-600 mb-1.5">
                      {f.label}{f.required && " *"}
                    </label>
                    <input
                      type="text"
                      name={`cf_${f.key}`}
                      required={f.required}
                      class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder={f.label}
                    />
                  </div>
                ))}

                <div class="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    id="submit-btn"
                    class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    onclick="this.disabled=true;this.textContent='预约中...';this.form.submit()"
                  >
                    确认预约
                  </button>
                  <a
                    href={`/${slug}?year=${dateObj.getFullYear()}&month=${dateObj.getMonth() + 1}&date=${dateObj.getDate()}`}
                    class="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    返回
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>

        <BookingFooter />
      </div>
    </Layout>
  );
});

// Handle booking submission
app.post("/:slug/book", async (c) => {
  const db = c.get("db");
  const slug = c.req.param("slug");
  const event = await EventTypesService.findBySlug(db, slug);
  if (!event || !event.published) return c.redirect("/");

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
        <div class="flex flex-col min-h-screen">
          <BookingHeader />
          <div class="flex-1 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 max-w-md text-center border border-slate-200/80">
              <div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke-width="2" />
                  <path d="M15 9l-6 6M9 9l6 6" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <h1 class="text-xl font-bold text-slate-900 mb-2">该时间已被预约</h1>
              <p class="text-slate-500 text-sm mb-6">该时段刚刚被其他人预约，请选择其他时间。</p>
              <a href={`/${slug}`} class="inline-flex items-center justify-center bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm">
                返回日历
              </a>
            </div>
          </div>
          <BookingFooter />
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
  } else if (event.meeting_provider === "google") {
    const gClientId = getEnvVar(c, "GOOGLE_CLIENT_ID");
    const gClientSecret = getEnvVar(c, "GOOGLE_CLIENT_SECRET");
    const gRefreshToken = getEnvVar(c, "GOOGLE_REFRESH_TOKEN");
    if (gClientId && gClientSecret && gRefreshToken) {
      const isoStart = `${date}T${time}:00+08:00`;
      const isoEnd = `${date}T${endTimeStr}:00+08:00`;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const meeting = await GoogleMeetService.createMeeting(
            gClientId,
            gClientSecret,
            gRefreshToken,
            `${event.name} - ${name}`,
            isoStart,
            isoEnd
          );
          meetingId = meeting.event_id;
          meetingUrl = meeting.meeting_url;
          break;
        } catch (e) {
          console.error(`Google Meet attempt ${attempt}/3 failed:`, e);
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

  const meetingFailed = (event.meeting_provider === "tencent" || event.meeting_provider === "google") && !meetingUrl ? "1" : "";
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
  const dateLabel = dateObj.toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: DEFAULT_TZ,
  });

  return c.html(
    <Layout title="Booking Confirmed">
      <div class="flex flex-col min-h-screen">
        <BookingHeader />

        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 md:p-10 max-w-lg w-full border border-slate-200/80">
            {/* Success header */}
            <div class="text-center mb-8">
              <div class="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg
                  class="w-8 h-8 text-emerald-600"
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
              <h1 class="text-2xl font-bold text-slate-900 mb-2">
                预约成功
              </h1>
            </div>

            {meetingFailed && (
              <div class="bg-amber-50 border border-amber-200/60 rounded-xl p-4 mb-6">
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 9v2m0 4h.01M12 2l10 18H2L12 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <p class="text-sm text-amber-800">
                    会议链接生成失败，主持人将另行分享会议信息。
                  </p>
                </div>
              </div>
            )}

            {/* Booking details */}
            <div class="bg-slate-50/80 rounded-xl p-5 space-y-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">活动</p>
                  <p class="font-medium text-slate-900 mt-0.5">{event.name}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                    <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">时间</p>
                  <p class="font-medium text-slate-900 mt-0.5">{time} - {endTimeStr}, {dateLabel}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round" />
                    <circle cx="12" cy="7" r="4" stroke-width="2" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">参与人</p>
                  <p class="font-medium text-slate-900 mt-0.5">{event.host_name} and {name}</p>
                </div>
              </div>
              {bookingMeetingUrl && (
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <MeetingIcon provider={event.meeting_provider} />
                  </div>
                  <div>
                    <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">会议地点</p>
                    <MeetingButton provider={event.meeting_provider} url={bookingMeetingUrl} />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div class="mt-6 flex items-center justify-center gap-4">
              {manageUrl && (
                <a
                  href={manageUrl}
                  class="text-indigo-600 text-sm font-medium hover:underline"
                >
                  管理预约
                </a>
              )}
              {manageUrl && (
                <span class="text-slate-300">|</span>
              )}
              <a
                href={`/${slug}`}
                class="text-slate-500 text-sm hover:text-slate-900 transition-colors"
              >
                再次预约
              </a>
            </div>
          </div>
        </div>

        <BookingFooter />
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
        <div class="flex flex-col min-h-screen">
          <BookingHeader />
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <h1 class="text-xl font-bold text-slate-900 mb-2">未找到预约</h1>
              <p class="text-sm text-slate-500">该链接可能已过期或无效。</p>
            </div>
          </div>
          <BookingFooter />
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
      <div class="flex flex-col min-h-screen">
        <BookingHeader title="管理你的预约" />

        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 md:p-10 max-w-lg w-full border border-slate-200/80">
            {/* Status header */}
            <div class="text-center mb-8">
              <div class={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
                b.status === "confirmed" ? "bg-emerald-50" : "bg-red-50"
              }`}>
                {b.status === "confirmed" ? (
                  <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                ) : (
                  <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
                  </svg>
                )}
              </div>
              <h1 class="text-2xl font-bold text-slate-900 mb-2">你的预约</h1>
              <span
                class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  b.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {b.status}
              </span>
            </div>

            {/* Booking details */}
            <div class="bg-slate-50/80 rounded-xl p-5 space-y-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">活动</p>
                  <p class="font-medium text-slate-900 mt-0.5">{b.event_name}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                    <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">时间</p>
                  <p class="font-medium text-slate-900 mt-0.5">{startTime} - {endTime}, {dateLabel}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round" />
                    <circle cx="12" cy="7" r="4" stroke-width="2" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">参与人</p>
                  <p class="font-medium text-slate-900 mt-0.5">{(b as any).host_name} and {b.invitee_name}</p>
                </div>
              </div>
              {b.meeting_url && (
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <MeetingIcon provider={(b as any).meeting_provider} />
                  </div>
                  <div>
                    <p class="text-xs text-slate-400 uppercase tracking-wider font-medium">会议地点</p>
                    {b.status === "cancelled" ? (
                      <span class="inline-flex items-center gap-1.5 mt-1.5 bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm font-medium line-through">
                        会议已取消
                      </span>
                    ) : (
                      <MeetingButton provider={(b as any).meeting_provider} url={b.meeting_url} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cancel action */}
            {b.status === "confirmed" && (
              <div class="mt-6 text-center">
                <button
                  class="text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
                  onclick="document.getElementById('cancel-dialog').showModal()"
                >
                  取消此预约
                </button>

                <dialog id="cancel-dialog" class="rounded-2xl shadow-2xl p-0 backdrop:bg-black/40 border border-slate-200">
                  <form method="post" action={`/${(b as any).slug}/manage/${token}/cancel`} class="p-6 w-96">
                    <h3 class="text-lg font-semibold text-slate-900 mb-1">取消预约</h3>
                    <p class="text-sm text-slate-500 mb-4">此操作不可撤销。</p>
                    <textarea
                      name="reason"
                      rows={3}
                      placeholder="取消原因（选填）"
                      class="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm mb-4 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                    <div class="flex gap-2 justify-end">
                      <button type="button" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors" onclick="document.getElementById('cancel-dialog').close()">返回</button>
                      <button type="submit" class="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-all shadow-sm">确认取消</button>
                    </div>
                  </form>
                </dialog>
              </div>
            )}

            {/* Cancellation reason */}
            {b.status === "cancelled" && b.cancel_reason && (
              <div class="mt-6 bg-red-50/80 border border-red-100 rounded-xl p-4">
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke-width="2" />
                    <path d="M12 8v4M12 16h.01" stroke-width="2" stroke-linecap="round" />
                  </svg>
                  <div>
                    <p class="text-sm text-red-600 font-medium mb-0.5">取消原因</p>
                    <p class="text-sm text-slate-600">{b.cancel_reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <BookingFooter />
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
  const reason = (body.reason as string) || "由受邀者取消";

  // Cancel meeting if applicable
  if (b.meeting_id) {
    const provider = (b as any).meeting_provider;
    if (provider === "tencent") {
      const meetingToken = getEnvVar(c, "TENCENT_MEETING_TOKEN");
      if (meetingToken) {
        try {
          await TencentMeetingService.cancelMeeting(meetingToken, b.meeting_id);
        } catch (e) {
          console.error("Failed to cancel Tencent Meeting:", e);
        }
      }
    } else if (provider === "google") {
      const gClientId = getEnvVar(c, "GOOGLE_CLIENT_ID");
      const gClientSecret = getEnvVar(c, "GOOGLE_CLIENT_SECRET");
      const gRefreshToken = getEnvVar(c, "GOOGLE_REFRESH_TOKEN");
      if (gClientId && gClientSecret && gRefreshToken) {
        try {
          await GoogleMeetService.cancelMeeting(gClientId, gClientSecret, gRefreshToken, b.meeting_id);
        } catch (e) {
          console.error("Failed to cancel Google Meet:", e);
        }
      }
    }
  }

  await BookingsService.cancel(db, b.id, reason);
  return c.redirect(`/${slug}/manage/${token}`);
});

export default app;
