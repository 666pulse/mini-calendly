import { Hono } from "hono";
import * as EventTypesService from "../services/event-types.service";
import { Layout } from "../components/Layout";

const app = new Hono();

app.get("/", (c) => {
  const events = EventTypesService.listAll();

  return c.html(
    <Layout title="Calendly">
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="w-full max-w-lg">
          <h1 class="text-2xl font-bold text-gray-900 text-center mb-8">Schedule a Meeting</h1>
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
                    <div class="w-1.5 h-12 rounded-full" style={`background: ${event.color}`} />
                    <div class="flex-1">
                      <h2 class="font-semibold text-gray-900">{event.name}</h2>
                      <p class="text-sm text-gray-500 mt-0.5">
                        {event.duration_minutes} min &middot; {event.host_name}
                      </p>
                      {event.description && (
                        <p class="text-sm text-gray-400 mt-1">{event.description}</p>
                      )}
                    </div>
                    <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
});

export default app;
