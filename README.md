# Boostup AI Smart QR

Mobile-first Google Review automation SaaS for centrally managed businesses. The application includes admin authentication, business and subscription management, question configuration, anonymous review generation, customer-controlled Google handoff, permanent QR assets, and server-aggregated analytics.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Use `AI_PROVIDER=mock` locally. Supabase-backed features require the three Supabase values in `.env.local`; the homepage and public liveness endpoint do not. Environment files other than `.env.example` are Git-ignored.

## Production configuration

Required production variables:

- `NEXT_PUBLIC_APP_URL`: final HTTPS origin, with no credentials, query, or fragment.
- `NEXT_PUBLIC_SUPABASE_URL`: browser-safe Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key; RLS remains the security boundary.
- `SUPABASE_SECRET_KEY`: server-only key used by narrow privileged flows.
- `RATE_LIMIT_SECRET`: random server-only value of at least 32 characters used only to HMAC rate-limit identifiers.
- `AI_PROVIDER=gemini` and `GEMINI_API_KEY` for the supported production AI path.

Optional server variables are `GEMINI_MODEL` (default `gemini-2.5-flash-lite`), `AI_TIMEOUT_MS` (3–30 seconds, default 15 seconds), `LOG_LEVEL`, `OPENAI_API_KEY` for the existing inactive compatibility path, and `READINESS_TOKEN` to enable the protected readiness endpoint. `AI_PROVIDER=mock` is development-only and rejected when `VERCEL_ENV=production` or `APP_ENV=production`.

Never put `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SECRET`, Gemini/OpenAI keys, or `READINESS_TOKEN` in a `NEXT_PUBLIC_` variable.

## Database

Migrations are source-controlled in `supabase/migrations`. For a linked project:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Do not rewrite or delete a migration already applied to production. Review `docs/PRODUCTION_READINESS.md` before any release or recovery operation.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
npm audit
```

`GET /api/health` is a dependency-free liveness check. When `READINESS_TOKEN` is configured, `GET /api/health/readiness` checks critical configuration and database access and requires `Authorization: Bearer <token>`.

Do not print final QR codes until the final production domain is confirmed in `NEXT_PUBLIC_APP_URL` and a complete scan test succeeds against that deployment.

See [`docs/PRODUCTION_READINESS.md`](./docs/PRODUCTION_READINESS.md) for the release, backup, security, observability, and manual QA checklist.
