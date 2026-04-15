# Architecture Decision Record

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Bun / Cloudflare Workers | Dual-target: Bun for VPS, Workers for edge |
| Framework | Hono | Lightweight, runs on both Bun and CF Workers, built-in JSX |
| Rendering | Hono JSX (SSR) | Server-side rendering, zero client-side framework |
| Database | SQLite (bun:sqlite) / Cloudflare D1 | Adapter pattern, same schema both platforms |
| Styling | Tailwind CSS (CDN) | No build step, rapid prototyping |
| Auth | Hono Basic Auth | Simple, reads from env (process.env or CF bindings) |

## Project Structure

```
src/
├── index.ts                          # Bun entry point
├── worker.ts                         # Cloudflare Workers entry point
├── app.ts                            # Shared Hono app factory (routes, middleware, auth)
├── db/
│   ├── adapter.ts                    # DbAdapter interface (unified async API)
│   ├── sqlite-adapter.ts             # bun:sqlite implementation
│   ├── d1-adapter.ts                 # Cloudflare D1 implementation
│   ├── schema.ts                     # Shared schema init + migrations
│   └── seed.ts                       # Seed data (demo event type)
├── services/
│   ├── entities.ts                   # Shared type definitions (EventType, Booking, etc.)
│   ├── event-types.service.ts        # EventType + Availability CRUD
│   ├── bookings.service.ts           # Booking CRUD + conflict detection + list/filter/paginate
│   └── tencent-meeting.service.ts    # Tencent Meeting API client (JSONRPC 2.0)
├── lib/
│   ├── availability.ts               # Time slot calculation logic
│   └── hooks.ts                      # DB lifecycle hooks (onAfterCreate, onAfterUpdate)
├── routes/
│   ├── home.tsx                      # Public event list page
│   ├── booking.tsx                   # Public booking flow (calendar → time → form → confirm)
│   ├── admin.tsx                     # Admin route index (mounts sub-routes)
│   └── admin/
│       ├── dashboard.tsx             # GET /admin — overview
│       ├── events.tsx                # /admin/events/* — CRUD event types
│       └── bookings.tsx              # /admin/events/:id/bookings/* — RESTful booking management
├── components/
│   ├── Layout.tsx                    # HTML shell (head, Tailwind CDN)
│   ├── Calendar.tsx                  # Month calendar with available date highlighting
│   ├── TimeSlots.tsx                 # Available time slot list
│   ├── AvailabilityEditor.tsx        # Multi-block per-day availability editor
│   └── CustomFieldsEditor.tsx        # Dynamic key-value custom fields editor
wrangler.toml                         # Cloudflare Workers config
db/
└── data.db                           # SQLite database file (gitignored)
```

## Layered Architecture (NestJS-style)

```
Routes (routes/*.tsx)        ← HTTP handling, request parsing, JSX rendering
  ↓
Services (services/*.ts)     ← Data access, business logic (receives DbAdapter)
  ↓
DbAdapter (db/adapter.ts)    ← Unified async interface
  ↓
SQLite / D1                  ← Platform-specific implementation
```

- **Routes** get `db` from Hono context (`c.get("db")`), call services, return JSX
- **Services** receive `DbAdapter` as first param, encapsulate all SQL
- **Hooks** (`lib/hooks.ts`) run after create/update — auto-sets `updated_at`
- **Entities** define shared TypeScript interfaces across layers

Routes never write raw SQL. Services never return HTTP responses.

## RESTful URL Design

```
Public:
  GET  /                                    Event list
  GET  /:slug                               Booking page (calendar)
  GET  /:slug/book                          Booking form
  POST /:slug/book                          Submit booking
  GET  /:slug/confirmed                     Confirmation page

Admin (Basic Auth):
  GET  /admin                               Dashboard
  GET  /admin/events/new                    New event form
  POST /admin/events                        Create event
  GET  /admin/events/:id                    Edit event form
  POST /admin/events/:id                    Update event
  POST /admin/events/:id/delete             Delete event
  GET  /admin/events/:id/bookings           Bookings for event (filter, paginate)
  POST /admin/events/:id/bookings/export.csv  Export CSV
  GET  /admin/events/:id/bookings/:bid      Booking detail
  POST /admin/events/:id/bookings/:bid/cancel   Cancel with reason
  GET  /admin/events/:id/bookings/:bid/confirm  Re-confirm
  GET  /admin/bookings                      All bookings (cross-event)
```

## Data Model

```
event_types
├── id, slug, name, host_name
├── duration_minutes, description, color
├── custom_fields (JSON)        ← dynamic form fields config
├── meeting_provider            ← 'none' | 'static' | 'tencent'
├── meeting_url                 ← static meeting URL
├── start_date, end_date        ← booking date range limits
├── created_at, updated_at

availability
├── id, event_type_id
├── day_of_week (0=Sun..6=Sat)
├── start_time, end_time        ← multiple rows per day (AM/PM blocks)
├── created_at, updated_at

bookings
├── id, event_type_id
├── invitee_name, invitee_email
├── start_time, end_time, timezone
├── notes, cancel_reason
├── status                      ← CHECK('confirmed','cancelled')
├── meeting_id, meeting_code    ← Tencent Meeting identifiers
├── meeting_url                 ← join link (auto-generated or static)
├── custom_data (JSON)          ← values for custom fields
├── created_at, updated_at
```

## Deployment

### VPS (Bun + SQLite)
```bash
bun install && bun run seed && bun run dev
```
Entry: `src/index.ts` → `sqlite-adapter.ts` → local `db/data.db`

Env vars via `.env` file (auto-loaded by Bun):
```
TENCENT_MEETING_TOKEN=xxx
ADMIN_USER=admin
ADMIN_PASS=admin
```

### Cloudflare Workers (D1)
```bash
wrangler d1 create mini-calendly-db    # create D1 database
# fill database_id in wrangler.toml
wrangler deploy                         # deploy to edge
```
Entry: `src/worker.ts` → `d1-adapter.ts` → Cloudflare D1

## Key Decisions

### Dual-platform via DbAdapter
`DbAdapter` is an async interface with `run`, `get`, `all`, `exec`. Two implementations:
- `sqlite-adapter.ts` wraps `bun:sqlite` sync API in async
- `d1-adapter.ts` wraps Cloudflare D1 native async API

Services receive `DbAdapter` via Hono context — zero code change to switch platforms.

### Application-level hooks instead of DB triggers
`lib/hooks.ts` provides `onAfterCreate` / `onAfterUpdate` hooks. `updated_at` is set by a built-in hook, not a SQLite trigger. This is database-agnostic and works on both SQLite and D1.

### SSR-only, minimal client JS
Pages are server-rendered. Client-side JS is limited to:
- AvailabilityEditor: dynamic add/remove time blocks
- CustomFieldsEditor: dynamic add/remove custom fields
- Cancel booking: native `<dialog>` modal
- Copy link button on admin dashboard

No SPA framework, no hydration, no client-side routing.

### Multiple availability blocks per day
One `availability` row = one time block. A day can have multiple rows (e.g. 09:00-12:00 + 13:00-17:00) to support lunch breaks and gaps.

### Custom fields as JSON
`event_types.custom_fields` stores field definitions as JSON array.
`bookings.custom_data` stores submitted values as JSON object.
Avoids schema changes when adding new fields per event type.

### Inline migrations
`db/schema.ts` runs `ALTER TABLE` migrations on startup via `PRAGMA table_info` checks. No migration tool needed for this scale.

### Strict: false on Hono
`new Hono({ strict: false })` so `/admin` and `/admin/` both resolve correctly.

### RESTful nested resources
Bookings are nested under events: `/admin/events/:id/bookings/:bid`. A global `/admin/bookings` view is also available for cross-event queries. Shared rendering functions avoid code duplication between the two views.

### Meeting provider integration
Event types support `meeting_provider` field with three modes:
- `none` — no meeting link
- `static` — admin sets a fixed URL (Google Meet, Zoom, etc.), reused for all bookings
- `tencent` — auto-creates a unique Tencent Meeting via API on each booking, auto-cancels on booking cancellation

Tencent Meeting integration uses their JSONRPC 2.0 API (`mcp.meeting.tencent.com`), authenticated via `TENCENT_MEETING_TOKEN` env var. Token from https://meeting.tencent.com/ai-skill. Meeting info (meeting_id, meeting_code, join_url) is stored per booking, shown on confirmation page and admin booking detail.

API response format: JSONRPC 2.0 → `result.content[0].text` → JSON string with `{ status_code, headers, body }` → `body` is JSON string with `meeting_info_list[0].{meeting_id, meeting_code, join_url}`.

### Proxy handling
Bun's `fetch` does not auto-read `http_proxy`/`https_proxy` env vars. The Tencent Meeting service reads proxy from env and passes it via Bun's `fetch({ proxy })` option. Cloudflare Workers doesn't need proxy — this only applies to local/VPS deployment.
