import { Hono } from "hono";
import type { Env } from "../app";
import * as EventTypesService from "../services/event-types.service";
import { Layout } from "../components/Layout";

const app = new Hono<Env>();

app.get("/", async (c) => {
  const db = c.get("db");
  const events = await EventTypesService.listPublished(db);

  return c.html(
    <Layout title="Mini Calendly">
      <div class="flex flex-col min-h-screen">
        {/* Header / Nav */}
        <header class="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
          <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <span class="text-base font-semibold text-slate-900 tracking-tight">Mini Calendly</span>
            </div>
            <a
              href="/admin"
              class="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              管理后台
            </a>
          </div>
        </header>

        {/* Hero Banner — 克制、浅色、工具感 */}
        <div class="bg-white border-b border-slate-200">
          <div class="max-w-5xl mx-auto px-6 py-12">
            <div class="max-w-2xl">
              <div class="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 mb-4">
                <div class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span class="text-xs font-medium text-slate-600">{events.length} 个活动可预约</span>
              </div>
              <h1 class="text-2xl md:text-3xl font-bold text-slate-900 leading-tight tracking-tight mb-2">
                预约时间，共建未来
              </h1>
              <p class="text-sm md:text-base text-slate-500 leading-relaxed max-w-lg">
                选择下方活动，挑选合适的时间，轻松完成预约。
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div class="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
          {/* Section header */}
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">浏览活动</h2>
              <p class="text-sm text-slate-500 mt-0.5">选择一个活动类型进行预约</p>
            </div>
          </div>

          {events.length === 0 ? (
            <div class="bg-white rounded-xl border border-slate-200 p-16 text-center">
              <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <p class="text-lg font-semibold text-slate-900 mb-1">暂无活动</p>
              <p class="text-sm text-slate-500">请稍后再来或联系组织者。</p>
            </div>
          ) : (
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {events.map((event) => (
                <a
                  href={`/${event.slug}`}
                  class="group flex items-center gap-5 px-6 py-5 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Color accent & icon */}
                  <div class="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold text-slate-900 truncate">{event.name}</h3>
                    </div>
                    <p class="text-sm text-slate-500 mt-0.5">
                      {event.host_name}
                    </p>
                    {event.description && (
                      <p class="text-sm text-slate-400 mt-1 line-clamp-1">{event.description}</p>
                    )}
                  </div>

                  {/* Right side - duration badge & arrow */}
                  <div class="flex items-center gap-4 flex-shrink-0">
                    <span class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke-width="2" />
                        <path d="M12 6v6l4 2" stroke-width="2" stroke-linecap="round" />
                      </svg>
                      {event.duration_minutes} 分钟
                    </span>
                    <svg
                      class="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M9 5l7 7-7 7"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* How it works section */}
          <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="flex items-start gap-4">
              <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span class="text-sm font-medium text-indigo-600">1</span>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-slate-900">选择活动</h3>
                <p class="text-sm text-slate-500 mt-0.5">选择适合你的会议类型</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span class="text-sm font-medium text-indigo-600">2</span>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-slate-900">选择时间</h3>
                <p class="text-sm text-slate-500 mt-0.5">从可用时段中选择日期和时间</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span class="text-sm font-medium text-indigo-600">3</span>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-slate-900">预约完成</h3>
                <p class="text-sm text-slate-500 mt-0.5">收到包含会议详情的确认通知</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer class="border-t border-slate-200 bg-white">
          <div class="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
                </svg>
              </div>
              <span class="text-sm font-medium text-slate-900">Mini Calendly</span>
            </div>
            <span class="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Rebase Community. 保留所有权利。
            </span>
          </div>
        </footer>
      </div>
    </Layout>,
  );
});

export default app;
