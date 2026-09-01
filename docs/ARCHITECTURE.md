# Architecture

## Target stack

- Next.js App Router, TypeScript, and Tailwind CSS
- Supabase PostgreSQL, Auth, Storage, RLS, and versioned migrations
- Vercel for the Next.js application
- Provider-independent AI adapters

Supabase and Vercel are architectural targets only and are not connected in Phase 1.

## Application boundaries

```text
Routes and UI
  → server actions / route handlers
  → application services
  → repositories
  → Supabase PostgreSQL
```

- `src/app` owns routes, layouts, and route handlers.
- `src/components/ui` will contain reusable interface primitives.
- `src/features` will group product-specific UI, schemas, actions, and queries.
- `src/lib` contains focused infrastructure helpers such as environment validation.
- `src/server/services` owns business workflows.
- `src/server/repositories` owns persistence access.
- `src/types` contains shared domain types where feature-local types are unsuitable.

Business logic must not live in presentation components. Client Components should be limited to interactions that require browser state.

## Public flow

The main customer route is `/r/[slug]`. The server resolves the slug, checks business status and the effective subscription, and returns either the review experience or a friendly unavailable state. The interactive question and review steps remain within this route.

The handoff is: generate review → optionally edit or regenerate → copy to clipboard → record `GOOGLE_REVIEW_CLICK` → open the configured Google Review URL. Clipboard failure must offer a manual-copy fallback without blocking navigation.

## Admin flow

Supabase Auth will authenticate the central admin. Every privileged read and mutation will also authorize the admin server-side. Future admin pages will use mobile cards, bottom navigation, touch-friendly forms, drawers, and sticky actions, with desktop as progressive enhancement.

## AI boundary

Feature code will call one `generateReview()` application service. Provider adapters will implement a shared contract for mock, Gemini, and OpenAI. API keys remain server-only. The server enforces one initial generation and one regeneration per review session.

## Security and performance

- Store secrets only in server environment variables.
- Validate external input at server boundaries.
- Use Supabase RLS as defense in depth; privileged operations stay server-side.
- Never trust client-submitted business identifiers without resolving ownership/context.
- Rate-limit public generation and abuse-sensitive endpoints.
- Render public QR pages server-side where beneficial and keep client JavaScript small.
- Do not use caching that can leave subscription changes stale.

## Phase 1 endpoints

- `/` is a temporary product-specific readiness page.
- `GET /api/health` returns `{ "status": "ok" }` without Supabase or AI dependencies.
