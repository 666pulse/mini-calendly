import { Hono } from "hono";
import type { Env } from "../app";
import * as EventTypesService from "../services/event-types.service";
import { Layout } from "../components/Layout";

const app = new Hono<Env>();

app.get("/", async (c) => {
  const db = c.get("db");
  const events = await EventTypesService.listAll(db);

  return c.html(
    <Layout title="Mini Calendly">
      <div class="flex flex-col min-h-screen">
        <div class="flex-1 flex items-center justify-center p-4">
          <div class="w-full max-w-lg">
            <h1 class="text-2xl font-bold text-slate-900 text-center mb-8">
              Schedule a Meeting
            </h1>
            {events.length === 0 ? (
              <p class="text-slate-500 text-center">No events available.</p>
            ) : (
              <div class="space-y-3">
                {events.map((event) => (
                  <a
                    href={`/${event.slug}`}
                    class="group block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200"
                  >
                    <div class="flex items-center gap-4">
                      <div
                        class="w-1.5 h-12 rounded-full"
                        style={`background: ${event.color}`}
                      />
                      <div class="flex-1">
                        <h2 class="font-semibold text-slate-900">
                          {event.name}
                        </h2>
                        <p class="text-sm text-slate-500 mt-0.5">
                          {event.duration_minutes} min &middot;{" "}
                          {event.host_name}
                        </p>
                        {event.description && (
                          <p class="text-sm text-slate-400 mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <svg
                        class="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors"
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
          </div>
        </div>

        <footer class="border-t border-slate-200 bg-white">
          <div class="max-w-lg mx-auto px-4 py-6 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-indigo-600" />
              <span class="text-sm font-medium text-slate-900">
                Mini Calendly
              </span>
            </div>
            <div class="flex items-center gap-4 text-xs text-slate-400">
              <span>
                Copyright &copy; {new Date().getFullYear()} Rebase Community.
                All rights reserved.
              </span>
            </div>
          </div>
        </footer>
      </div>
    </Layout>,
  );
});

export default app;
