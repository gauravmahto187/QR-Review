# Boostup AI Smart QR — Product and Architecture Decisions

This is the V1 decision log. Changes should be recorded here before architecture or implementation drifts.

## Product decisions

1. The brand name is **Boostup**, the product name is **AI Smart QR**, and the full product name is **Boostup AI Smart QR**.
2. V1 has one central admin; the schema may support multiple admins later, but there is no multi-admin UI.
3. Business statuses are `ACTIVE`, `SUSPENDED`, and `ARCHIVED`.
4. Subscription statuses are `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, and `CANCELLED`.
5. Subscription history is retained, with exactly one current/effective row per business.
6. Trial architecture supports a default seven-day trial that may later be configured or skipped.
7. Renewal durations are 1, 3, 6, or 12 months, plus custom expiry.
8. Timestamps represent UTC instants. Relevant dates display in `Asia/Kathmandu`.
9. Slugs become permanent immediately after business creation and do not follow display-name changes.
10. Reserved slugs are `admin`, `login`, `api`, `auth`, `dashboard`, `settings`, and `r`; application validation enforces them before creation.
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
26. The `business-logos` Storage bucket is public for delivery but denies anonymous write/list access. It allows PNG, JPEG, WebP, HEIC, and HEIF up to 2 MiB; unsupported browser previews fall back gracefully.
27. Storage bucket configuration belongs in `supabase/config.toml`; object policies belong in migrations. Hosted bucket creation is a reviewed manual/project setup action.
28. Migrations remain local and version-controlled until a Supabase project is explicitly created, linked, reviewed, and approved for push.
29. AI defaults to `mock`; Supabase and AI credentials are not required for the homepage or health endpoint.
30. Vercel plus Supabase remains the later deployment target. Deployment is not part of the current phase.
31. Admin sign-in uses Supabase email/password Auth at `/login`; passwords are handled only by Supabase Auth and are never stored by the application.
32. Authentication and authorization remain separate: every `/admin` route requires both a valid Auth identity and an `ADMIN` profile, checked server-side.
33. Authenticated non-admin users are denied, signed out after an attempted login, and cannot rely on client-side navigation to bypass protection.
34. The initial existing Auth user is provisioned through an idempotent secret-key script that verifies the Auth user before upserting `admin_profiles`. No password or secret is committed.
35. The mobile admin shell uses Home, Businesses, Reviews, and More bottom navigation; desktop progressively enhances this to a sidebar.
36. Home is functional. Reviews remains a protected placeholder, and More contains account/logout controls. No production analytics are fabricated.
37. Business management is mobile-first and uses cards rather than desktop tables. It includes server-side search/filter reads, create/edit/detail routes, secure logo management, and confirmed lifecycle actions.
38. Business archiving is a terminal soft-delete state in the admin application. There is no hard-delete action and archived businesses are retained for history.
39. All business reads use the authenticated RLS client. Every mutation requires server-side admin authorization and writes the applicable audit event.
40. Subscription lifecycle changes append a new current record and retain prior records as read-only history. The previous record is changed only to clear its technical `is_current` marker.
41. A seven-day trial is available only before any subscription history exists for the business.
42. Fixed-duration renewal extends from an existing unexpired trial/active expiry. If no valid trial/active period remains, calculation starts from the current UTC instant.
43. Custom expiry selects a Nepal calendar date and stores 23:59:59 `Asia/Kathmandu` as its equivalent UTC instant.
44. Availability never trusts stored status alone. Business status must be `ACTIVE`; subscription status must be `TRIAL` or `ACTIVE`; and `expires_at` must be in the future.
45. Effective expiry requires no scheduled job. Admin and future public access compute it at request time, while stored `EXPIRED` remains available for explicit normalization if needed later.
46. Expiring-soon classification supports today, within 3 days, within 7 days, and within 30 days for reuse in later summaries.
47. Subscription mutations run in one database transaction under authenticated-admin RLS, serialize per business, preserve one current row, and write their audit event atomically.
48. A business may have at most five active review questions. Individual questions are created inactive and require at least two active options before activation.
49. A question may have at most six options. An active question can never be reduced below two active options.
50. Question and option ordering uses server-controlled adjacent moves and unique sort positions per parent; clients do not submit arbitrary sort numbers.
51. Questions are safely archived with `archived_at`, disabled, and retained for history rather than physically deleted through the admin interface.
52. The recommended three-question template can be created only when no non-archived questions exist and is fully editable after creation.
53. Option values use lowercase hyphenated identifiers and are unique case-insensitively within each question.
54. The Phase 6 preview is admin-only and local to the page. It simulates active questions/options without creating sessions, checking subscriptions, invoking AI, or performing Google handoff.
55. `/r/[slug]` is the permanent public customer route and is dynamically evaluated against business and subscription availability on every request and mutation.
56. Public persistence uses a two-hour anonymous session plus an HttpOnly same-site cookie. No customer login or personal identity fields are introduced.
57. Answer JSON maps question UUIDs to option UUIDs. Server code revalidates every pair against the business’s current active configuration and accepts no browser-provided labels or values.
58. Only `en` and `ne` are stored for later generated-review language. Phase 7 does not translate the interface or generate review text.
59. `PAGE_VIEW` is best-effort and deduplicated per business/visitor cookie. `REVIEW_STARTED` is unique per session; `QUESTION_COMPLETED` remains excluded.
60. A valid business with no valid active questions does not create a session and shows a friendly configuration state. Unavailable and missing businesses expose no internal status details.
61. `generateReview()` is the sole AI boundary. Mock is the safe default, Gemini is the first real server provider, and the OpenAI adapter remains an inactive future-compatible stub.
62. Prompt `v1` receives only database-resolved business/question/option data and `en` or `ne`; browser-submitted prompt facts are never accepted.
63. Gemini uses `gemini-2.5-flash-lite`, a 15-second timeout, server-only credentials, normalized failure codes, and validated plain-text output.
64. Generation numbers are reserved atomically under a review-session lock. One initial generation and one regeneration are final database-enforced limits, including under concurrent requests.
65. Durable V1 abuse protection rejects duplicate in-flight calls, enforces a failed-attempt cooldown, and caps provider attempts per generation number. A shared coarse IP/provider quota is required before production launch.
66. Generated review editing is local and does not consume AI calls or persist keystrokes. Final edited-text persistence is deferred to Google handoff.
67. `REVIEW_GENERATED` and `REVIEW_REGENERATED` are unique per session/type, occur only after successful persistence, and remain non-blocking.
68. Phase 8 Continue shows an explicit Google-handoff-next message and performs no clipboard, redirect, posting, or Google automation.
