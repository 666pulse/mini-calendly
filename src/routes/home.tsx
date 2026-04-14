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
            <h1 class="text-2xl font-bold text-gray-900 text-center mb-8">
              Schedule a Meeting
            </h1>
            {events.length === 0 ? (
              <p class="text-gray-500 text-center">No events available.</p>
            ) : (
              <div class="space-y-3">
                {events.map((event) => (
                  <a
                    href={`/${event.slug}`}
                    class="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
                  >
                    <div class="flex items-center gap-4">
                      <div
                        class="w-1.5 h-12 rounded-full"
                        style={`background: ${event.color}`}
                      />
                      <div class="flex-1">
                        <h2 class="font-semibold text-gray-900">
                          {event.name}
                        </h2>
                        <p class="text-sm text-gray-500 mt-0.5">
                          {event.duration_minutes} min &middot;{" "}
                          {event.host_name}
                        </p>
                        {event.description && (
                          <p class="text-sm text-gray-400 mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <svg
                        class="w-5 h-5 text-gray-300"
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

        <footer class="border-t border-gray-200 bg-white">
          <div class="max-w-lg mx-auto px-4 py-6 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-blue-600" />
              <span class="text-sm font-medium text-gray-900">
                Mini Calendly
              </span>
            </div>
            <div class="flex items-center gap-4 text-xs text-gray-400">
              <span>
                &copy; {new Date().getFullYear()} Rebase Community
              </span>
            </div>
          </div>
        </footer>
      </div>
    </Layout>,
  );
});

export default app;
