# Production Readiness

## Environment classification

Browser-visible and required in production: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is not a secret; RLS must remain enabled.

Server-only and required in production: `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SECRET`, `AI_PROVIDER=gemini`, and `GEMINI_API_KEY`. Generate `RATE_LIMIT_SECRET` with a cryptographically secure password generator and keep it stable; rotation resets effective client buckets but does not require a database rewrite.

Optional server-only values: `GEMINI_MODEL`, `AI_TIMEOUT_MS`, `LOG_LEVEL`, `READINESS_TOKEN`, and the existing `OPENAI_API_KEY` compatibility value. `READINESS_TOKEN` must be 32+ characters. `AI_PROVIDER=mock` is development-only. Production validation is selected by Vercel's `VERCEL_ENV=production` or explicit `APP_ENV=production`.

## Rate limiting and public mutation safety

The durable limiter lives in Supabase and works across Vercel instances. Current fixed-window policies are 12 starts/10 minutes, 120 answers/10 minutes, 20 completions/10 minutes, 6 generations/10 minutes, 30 text saves/10 minutes, 12 handoffs/10 minutes, and 60 page-view events/minute per HMAC fingerprint. Generation also retains the stricter database-enforced two-successful-version limit, duplicate reservation lock, cooldown, and attempt caps.

Public mutation requests require same-origin browser context, use bounded JSON bodies (8 KiB for session actions and 2 KiB for page views), validate action-specific schemas, restore business/session identity on the server, and never accept a Google destination. Admin mutations are authenticated Server Actions protected by Next.js origin checks, `requireAdmin()`, Zod schemas, RLS, and authorization-checking RPCs.

## Security headers and allowed origins

The CSP permits the application itself plus Supabase HTTPS for images/connections. Inline scripts/styles remain allowed because the current Next.js runtime, hydration payload, Tailwind output, progress widths, and configured logo colors require them; `unsafe-eval` is development-only. Framing and plugins are denied. Camera, microphone, geolocation, payment, and USB are disabled. Clipboard is intentionally not disabled because Copy Review is a customer-triggered product action. HSTS is emitted only by production builds; TLS termination remains the host's responsibility.

## Logging and readiness

Structured logs contain operational event names and normalized codes, not customer review text, raw anonymous-session identifiers, IPs, cookies, auth headers, passwords, API keys, secrets, SQL details, or provider responses. Review Vercel log access/retention before launch. Add an external tracker later only after privacy and data-processing review.

Use `/api/health` for public liveness. If `READINESS_TOKEN` is configured, call `/api/health/readiness` with a bearer token from a protected monitor. It reports only readiness and tests database access; never expose the token in browser code.

## Backup and recovery

1. Confirm the production Supabase plan's backup retention and PITR capability.
2. Before releases, run `npx supabase migration list` and `npx supabase db push --dry-run`, review the SQL, and confirm a suitable backup/restore point.
3. Keep every migration in source control. Never rewrite a migration that production already applied.
4. For recovery, identify the affected time and migration, restore to a separate project or approved recovery target, verify row counts/RLS/public flow, and only then plan traffic switching.
5. Use a new forward corrective migration for schema repair. Never perform destructive recovery experiments on production.

## Release checklist

- Create the Vercel project but do not deploy traffic until approved.
- Confirm the final domain and set `NEXT_PUBLIC_APP_URL=https://<final-domain>` in every production context.
- Set all required server/public variables in Vercel and ensure secret values are not exposed as `NEXT_PUBLIC_*`.
- Set Supabase Auth site URL and permitted redirects to the exact final HTTPS origin; remove temporary localhost/LAN origins from production settings.
- Confirm migrations match and the `business-logos` bucket has the documented 2 MiB/MIME settings.
- Confirm backup/PITR and restore ownership.
- Run lint, typecheck, build, audit, secret scans, and the full authenticated/anonymous regression suite against a preview using production-like configuration.
- Test Gemini English/Nepali generation, timeout/provider failure, regeneration caps, and durable 429 behavior.
- Test 360, 390, and 430 px widths on iOS Safari and Android Chrome, including keyboard, safe areas, clipboard fallback, Google return navigation, HEIC/HEIF fallback, and QR scan behavior.
- Verify login/logout, RLS/unauthorized access, business/question/subscription lifecycle, PNG/SVG downloads, analytics isolation/date boundaries, unavailable/expired states, and friendly infrastructure failures.
- Verify security headers with the deployed host and ensure CSP has no unexpected violations.
- Confirm no localhost/LAN URL is encoded, then download and scan-test final PNG/SVG assets before printing. Previously printed QR codes using another origin cannot be repaired by a deployment.

Deployment remains a separate explicitly approved phase.
