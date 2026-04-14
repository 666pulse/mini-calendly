# Architecture Decision Record

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Bun | Built-in SQLite, fast startup, native TypeScript |
| Framework | Hono | Lightweight, Bun-native, built-in JSX support |
| Rendering | Hono JSX (SSR) | Server-side rendering, zero client-side framework |
| Database | SQLite (bun:sqlite) | Embedded, zero-config, single file |
| Styling | Tailwind CSS (CDN) | No build step, rapid prototyping |
| Auth | Hono Basic Auth | Simple, sufficient for admin protection |

## Project Structure

```
src/
├── index.ts                          # App entry, route mounting, middleware
├── db/
│   ├── index.ts                      # DB connection, schema init, migrations
│   └── seed.ts                       # Seed data (demo event type)
├── services/
│   ├── entities.ts                   # Shared type definitions (EventType, Booking, etc.)
│   ├── event-types.service.ts        # EventType + Availability CRUD
│   └── bookings.service.ts           # Booking CRUD + conflict detection
├── lib/
│   └── availability.ts               # Time slot calculation logic
├── routes/
│   ├── home.tsx                      # Public event list page
│   ├── booking.tsx                   # Public booking flow (calendar → time → form → confirm)
│   └── admin.tsx                     # Admin dashboard (CRUD events, manage bookings)
├── components/
│   ├── Layout.tsx                    # HTML shell (head, Tailwind CDN)
│   ├── Calendar.tsx                  # Month calendar with available date highlighting
│   ├── TimeSlots.tsx                 # Available time slot list
│   ├── AvailabilityEditor.tsx        # Multi-block per-day availability editor
│   └── CustomFieldsEditor.tsx        # Dynamic key-value custom fields editor
db/
└── data.db                           # SQLite database file (gitignored)
```

## Layered Architecture (NestJS-style)

```
Routes (routes/*.tsx)        ← HTTP handling, request parsing, JSX rendering
  ↓
Services (services/*.ts)     ← Data access, business logic
  ↓
Database (db/index.ts)       ← SQLite via bun:sqlite
```

- **Routes** handle HTTP requests, parse params/body, call services, return JSX
- **Services** encapsulate all SQL queries, expose typed functions
- **Entities** define shared TypeScript interfaces across layers
- **Lib** contains pure logic (availability calculation) that calls services

Routes never write raw SQL. Services never return HTTP responses.

## Data Model

```
event_types
├── id, slug, name, host_name
├── duration_minutes, description, color
├── custom_fields (JSON)        ← dynamic form fields config
├── start_date, end_date        ← booking date range limits
└── created_at

availability
├── id, event_type_id
├── day_of_week (0=Sun..6=Sat)
└── start_time, end_time        ← multiple rows per day (AM/PM blocks)

bookings
├── id, event_type_id
├── invitee_name, invitee_email
├── start_time, end_time, timezone
├── notes, status
├── custom_data (JSON)          ← values for custom fields
└── created_at
```

## Key Decisions

### SSR-only, minimal client JS
Pages are server-rendered. Client-side JS is limited to:
- AvailabilityEditor: dynamic add/remove time blocks
- CustomFieldsEditor: dynamic add/remove custom fields
- Copy link button on admin dashboard

No SPA framework, no hydration, no client-side routing.

### Multiple availability blocks per day
One `availability` row = one time block. A day can have multiple rows (e.g. 09:00-12:00 + 13:00-17:00) to support lunch breaks and gaps.

### Custom fields as JSON
`event_types.custom_fields` stores field definitions as JSON array.
`bookings.custom_data` stores submitted values as JSON object.
Avoids schema changes when adding new fields per event type.

### Inline migrations
`db/index.ts` runs `ALTER TABLE` migrations on startup via `PRAGMA table_info` checks. No migration tool needed for this scale.

### Strict: false on Hono
`new Hono({ strict: false })` so `/admin` and `/admin/` both resolve correctly.
