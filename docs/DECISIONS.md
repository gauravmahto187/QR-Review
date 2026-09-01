# Product and Architecture Decisions

This is the V1 decision log. Changes should be recorded here before architecture or implementation drifts.

## Product decisions

1. The temporary product name is **Smart Review QR**.
2. V1 has one central admin; the schema may support multiple admins later, but there is no multi-admin UI.
3. Business statuses are `ACTIVE`, `SUSPENDED`, and `ARCHIVED`.
4. Subscription statuses are `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, and `CANCELLED`.
5. Subscription history is retained, with exactly one current/effective row per business.
6. Trial architecture supports a default seven-day trial that may later be configured or skipped.
7. Renewal durations are 1, 3, 6, or 12 months, plus custom expiry.
8. Timestamps represent UTC instants. Relevant dates display in `Asia/Kathmandu`.
9. Slugs become permanent after activation or QR use and do not follow display-name changes.
10. Reserved slugs are `admin`, `login`, `api`, `auth`, `dashboard`, `settings`, and `r`; application validation will enforce them later.
11. The V1 public customer flow lives at `/r/[slug]`.
12. Businesses start with three questions, may have at most five, and each question may have at most six options. Maximum counts are application rules for a later phase.
13. V1 stores selected answers as JSONB with stable question and option IDs rather than a `review_answers` table.
14. Each review session permits one initial generation and one regeneration, enforced server-side and constrained in storage.
15. Only generated review text supports English (`en`) or Nepali (`ne`); the application has no full i18n system.
16. AI providers remain behind `generateReview()`: mock first, Gemini for development testing, and OpenAI later if selected.
17. Generated reviews are concise, answer-grounded, and stored for history/debugging without unnecessary customer PII.
18. Initial analytics excludes `QUESTION_COMPLETED`; a Google click is not evidence of submission.
19. QR and NFC use the same permanent URL. No unsupported Google automation is permitted.
20. Both admin and customer interfaces remain mobile-first for 360–430px viewports.

## Foundation decisions

21. Supabase uses the current publishable/secret API key model: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and server-only `SUPABASE_SECRET_KEY`. Legacy anon/service-role variable names are not used.
22. Browser and SSR clients use the publishable key. A separate `server-only` privileged client uses the secret key and bypasses RLS.
23. Supabase Auth establishes identity; `admin_profiles` establishes application authorization. No customer authentication is added.
24. Every application table has conservative RLS. Anonymous clients have no direct application-table access.
25. Public review operations will later be narrow server handlers, not broad anonymous policies.
26. The `business-logos` Storage bucket is public for delivery but denies anonymous write/list access. It allows PNG, JPEG, and WebP up to 2 MiB.
27. Storage bucket configuration belongs in `supabase/config.toml`; object policies belong in migrations. Hosted bucket creation is a reviewed manual/project setup action.
28. Migrations remain local and version-controlled until a Supabase project is explicitly created, linked, reviewed, and approved for push.
29. AI defaults to `mock`; Supabase and AI credentials are not required for the homepage or health endpoint.
30. Vercel plus Supabase remains the later deployment target. Deployment is not part of the current phase.
31. Admin sign-in uses Supabase email/password Auth at `/login`; passwords are handled only by Supabase Auth and are never stored by the application.
32. Authentication and authorization remain separate: every `/admin` route requires both a valid Auth identity and an `ADMIN` profile, checked server-side.
33. Authenticated non-admin users are denied, signed out after an attempted login, and cannot rely on client-side navigation to bypass protection.
34. The initial existing Auth user is provisioned through an idempotent secret-key script that verifies the Auth user before upserting `admin_profiles`. No password or secret is committed.
35. The mobile admin shell uses Home, Businesses, Reviews, and More bottom navigation; desktop progressively enhances this to a sidebar.
36. Home is functional in Phase 3. Businesses and Reviews are protected placeholders, and More contains account/logout controls. No production analytics are fabricated.
