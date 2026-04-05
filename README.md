# efa-players

A football data management prototype built for the Egyptian Football Association.

Manage players, clubs, matches, and leagues across 20+ European competitions —
all without a database in sight.

## What is this?

efa-players is an internal tooling prototype that lets football administrators
manage structured data across a full European football ecosystem. It covers
everything from player profiles and field schemas to match records and
multi-league club registrations.

The twist: there's no database. All data lives in-memory, seeded from fixture
files on server start. It's fast to spin up, easy to reset, and built for
demonstrating workflows — not storing them.

## How it works

- **Fixtures** (`src/mocks/fixtures/`) define the seed data — players, clubs,
  leagues, matches, roles, users, and dynamic field schemas
- **Store** (`src/lib/store.ts`) loads everything into a `globalThis` object
  on first boot, surviving hot reloads via a version key (`STORE_VERSION`)
- **API routes** (`src/app/api/[...path]/route.ts`) read and write directly
  to the store — no ORM, no migrations, no connection strings
- Bump `STORE_VERSION` to wipe and re-seed everything cleanly

## Coverage

19 countries · 25 leagues · 400+ clubs

From the Premier League to Ekstraklasa, Serie A to Eliteserien —
the full European football pyramid, seeded and ready.

## Getting started
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> All changes are in-memory. Restarting the server resets everything to
> the seeded state. This is by design.

## Stack

- [Next.js 14](https://nextjs.org) (App Router)
- TypeScript
- In-memory store with `globalThis` persistence across HMR
