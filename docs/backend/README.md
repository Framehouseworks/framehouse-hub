# Framehouse Hub — Backend Overview

## Architecture: Payload-Inside-Next.js

Payload CMS v3 runs **inside** the Next.js 15 app — there is no separate CMS process or server. Both are served from a single `pnpm dev` / Cloud Run instance on port 3000.

The `src/app/` directory is split into three Next.js route groups:

| Route group | Path | Purpose |
|---|---|---|
| `(app)/` | `/` | Public site — gallery, pricing, login, /learn, /company |
| `(dashboard)/` | `/dashboard` | Authenticated creative dashboard |
| `(payload)/` | `/admin` | Payload admin UI + REST/GraphQL APIs |

`src/payload.config.ts` is the **single source of truth** for all collections, globals, plugins, DB adapter, and editor config. Everything Payload knows about the data model flows from that file.

## Key Entry Points for Backend Work

```
src/payload.config.ts          # Collections, globals, DB, plugins, CORS, endpoints
src/collections/               # One directory (or file) per collection
src/globals/                   # Header, Footer, Pricing
src/access/                    # All access-control modules — never inline
src/app/api/                   # Custom Next.js API routes
src/migrations/                # Committed .ts + .json migration pairs
src/lib/                       # Shared utilities: storage-paths, processing-events, etc.
src/payload-types.ts           # Generated — do not edit manually
```

## Collections and Globals

### Finding and Modifying Collections

Every collection lives in `src/collections/<Name>/index.ts` (or `src/collections/<Name>.ts` for simple ones). After any schema change:

1. Run `pnpm payload migrate:create` to generate a migration.
2. Commit **both** the `.ts` and `.json` files in `src/migrations/`.
3. Run `pnpm generate:types` to regenerate `src/payload-types.ts`.
4. Update `src/seed/index.ts` if any new required fields were added.

`payload.config.ts` must import and register every collection under the `collections: []` array — Payload will not pick them up otherwise.

### Globals

Globals are singletons (one doc, no slug). They live in `src/globals/` and are registered under `globals: [Header, Footer, Pricing]` in `payload.config.ts`. Access via the Payload REST API at `/api/globals/{slug}`.

## REST API

Payload auto-generates CRUD endpoints for every registered collection:

```
GET    /api/{collection}          # List with pagination, filtering, sorting
POST   /api/{collection}          # Create
GET    /api/{collection}/{id}     # Read single
PATCH  /api/{collection}/{id}     # Update
DELETE /api/{collection}/{id}     # Delete
```

Query parameters follow Payload's query syntax:

```
?where[field][equals]=value
?where[and][0][field][equals]=val&where[and][1][field][gt]=val
?sort=-createdAt
?depth=2
?limit=20&page=2
?select[field]=true
```

Authentication uses HTTP-only cookies set by `POST /api/users/login`. For API clients, pass `Authorization: JWT <token>` obtained from the login response.

## GraphQL

GraphQL is available at `/api/graphql` (POST) and the playground at `/api/graphql-playground`. Every collection gets auto-generated queries and mutations. Use GraphQL for complex relational reads where REST depth limits are cumbersome.

## Custom API Routes

Custom business logic lives in `src/app/api/` as standard Next.js Route Handlers (`route.ts`). These sit alongside the Payload-generated endpoints. See `docs/backend/api-reference.md` for the full list.

## Database

- Adapter: `@payloadcms/db-postgres` with `push: false`.
- Schema changes **must** go through migrations — never `push: true` in any environment.
- Neon (serverless Postgres) is used in cloud; local dev uses Docker Postgres.
- Pool is automatically capped to 4 connections when the connection string contains `neon.tech`.
- Migration files: `src/migrations/`. CI validates that committed migrations fully describe the current Payload config (drift check via `migrate:create --name check_drift`).

## Folder / Library System

Portfolios use Payload's built-in folder feature (`folders: true` on the Portfolios collection). A root "Portfolio Library" folder is lazily created via the `/api/library-id` custom endpoint. Two folder-scoped hooks registered in `payload.config.ts` enforce:

- `protectLibraryFolder` — prevents deletion of the root library folder.
- `ensureFolderParenting` — ensures all portfolios are parented to the library on change.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URI` | Postgres connection string |
| `PAYLOAD_SECRET` | JWT signing secret |
| `GCS_BUCKET` | GCS bucket name (cloud mode only) |
| `GCS_PROJECT_ID` | GCP project ID for signing |
| `PROCESSOR_CALLBACK_SECRET` | Shared secret for worker ↔ process-callback auth |
| `LOCAL_WORKER_URL` | Go worker URL in local mode (default `http://localhost:8080`) |
| `NEXT_PUBLIC_SERVER_URL` | Public origin, used in CORS + signed URLs |
| `EXTRA_ALLOWED_ORIGINS` | Comma-separated additional CORS origins |

## Path Aliases

```
@/*             →  src/*
@payload-config →  src/payload.config.ts
@/payload-types →  src/payload-types.ts (generated)
```
