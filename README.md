# Boostup AI Smart QR

Mobile-first Google Review automation SaaS for centrally managed businesses.

The current foundation includes Next.js, typed Supabase browser/server clients, the V1 database migrations, conservative RLS, admin-auth utilities, and business-logo storage configuration. Product interfaces and workflows remain intentionally deferred.

## Local application

```bash
npm install
copy .env.example .env.local
npm run dev
```

The homepage and `/api/health` run without Supabase credentials. Supabase-backed code fails with a clear configuration error only when it is used. AI defaults to `mock`, so AI credentials remain optional.

## Local Supabase

The Supabase CLI is installed as a development dependency. Running the local stack requires Docker Desktop or another Docker-compatible runtime.

```bash
npx supabase start
npx supabase db reset
npx supabase seed buckets
```

Do not push migrations until a project has been created, reviewed, and linked.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

See [`docs`](./docs) for the approved product context, architecture, database design, and decision log.
