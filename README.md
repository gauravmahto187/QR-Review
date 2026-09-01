# Smart Review QR

Mobile-first Google Review automation SaaS for centrally managed businesses.

Phase 1 contains only the Next.js foundation, environment validation, project documentation, and a dependency-free health endpoint. Product features are intentionally deferred.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

The environment file is optional in Phase 1. Missing Supabase and AI credentials do not prevent the application from running, and the AI provider defaults to `mock`.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

See the [`docs`](./docs) directory for product context and architecture decisions.
