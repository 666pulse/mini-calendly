# mini-calendly

A lightweight Calendly clone built with Hono + Hono JSX + Bun + SQLite.

## Setup

```bash
# Install dependencies
bun install

# Initialize seed data
bun run seed

# Start dev server (hot reload)
bun run dev
```

Open `http://localhost:3000`

## Routes

| URL | Description |
|-----|-------------|
| `/` | Event list (public) |
| `/:slug` | Booking page |
| `/admin` | Admin dashboard (Basic Auth) |

## Config

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_USER` | `admin` | Admin username |
| `ADMIN_PASS` | `admin` | Admin password |

## Tech Stack

- [Architecture Decision Record](doc/adr.md)
