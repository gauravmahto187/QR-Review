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
35. The mobile admin shell uses Home, Businesses, Activity, and More bottom navigation; desktop progressively enhances this to a sidebar.
36. Home focuses on aggregate metrics, trends, and subscription alerts. Activity contains the protected privacy-safe recent event feed, and More contains account/logout controls. No production analytics are fabricated.
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
63. Gemini uses `gemini-3.5-flash-lite`, a 15-second timeout, server-only credentials, normalized failure codes, and validated plain-text output. The previous 2.5 default is no longer available to new API users.
64. Vercel Functions run in `bom1` so database-backed requests execute beside the Mumbai Supabase project instead of the `iad1` default.
64. Generation numbers are reserved atomically under a review-session lock. One initial generation and one regeneration are final database-enforced limits, including under concurrent requests.
65. Durable V1 abuse protection rejects duplicate in-flight calls, enforces a failed-attempt cooldown, and caps provider attempts per generation number. A shared coarse IP/provider quota is required before production launch.
66. Generated review editing is local and does not consume AI calls or persist keystrokes. Final edited-text persistence is deferred to Google handoff.
67. `REVIEW_GENERATED` and `REVIEW_REGENERATED` are unique per session/type, occur only after successful persistence, and remain non-blocking.
68. Phase 8 ended with an explicit Google-handoff-next message and performed no clipboard, redirect, posting, or Google automation.
69. Phase 9 clipboard access occurs only inside explicit Copy Review or Continue to Google actions. Clipboard failure preserves visible text and offers manual copy plus Open Google anyway.
70. Edited text is persisted only as a Copy/Continue checkpoint on the latest successful generation. Every keystroke is never sent or stored, and original AI output is retained separately.
71. Google handoff revalidates the anonymous session, business availability, latest successful generation, and the current business-owned HTTPS Google URL. The browser cannot choose the redirect destination.
72. Successful clipboard handoff uses same-tab navigation for mobile reliability. No popup, auto-paste, DOM injection, automatic posting, or submission claim is allowed.
73. `GOOGLE_REVIEW_CLICK` means the customer explicitly initiated the Google handoff, not that Google accepted or published a review. Thirty-second deduplication suppresses accidental duplicate taps without blocking later retries.
74. An expired session cookie produces a friendly restart state. A finalized review restores after refresh only while its anonymous session remains valid.
75. Every business QR encodes only the permanent URL produced from `NEXT_PUBLIC_APP_URL` and the stored immutable slug: `/r/[slug]`.
76. QR generation uses the lightweight `qrcode` package with high error correction, a four-module quiet zone, black modules, and a white background. Decorative overlays are excluded for scan reliability.
77. QR assets are derived on demand rather than stored. Admins receive a 1600px PNG and vector SVG named `boostup-{slug}-qr`.
78. Admin QR preview and downloads require server-side admin authorization and business lookup. The endpoint accepts no arbitrary URL or redirect input.
79. Business display name, status, subscription, questions, and AI behavior do not change QR identity. Expiry/suspension shows the existing public unavailable state; renewal restores access through the same print.
80. NFC requires no separate route or token in V1 and will encode the same permanent URL returned by the shared helper.
81. A configured public base URL may use HTTP for local development or HTTPS for production, but may not contain credentials, query parameters, or fragments. Production must set the deployed HTTPS origin before printing assets.
82. `/admin` is the platform analytics dashboard; `/admin/businesses/[id]/analytics` is the isolated business view. Both remain server-rendered and mobile-first.
83. Dashboard aggregation occurs in authenticated PostgreSQL functions. Raw, unbounded analytics rows are never loaded into the browser, and platform aggregation does not loop over businesses.
84. The default event range is the last 30 days, with Today, 7-day, 30-day, and validated custom options. Calendar boundaries and daily buckets use `Asia/Kathmandu`; storage and filtering remain UTC.
85. Review Start Rate is `REVIEW_STARTED / PAGE_VIEW`; Generation Rate is `REVIEW_GENERATED / REVIEW_STARTED`; Google Handoff Rate is `GOOGLE_REVIEW_CLICK / REVIEW_GENERATED`; Overall Handoff Conversion is `GOOGLE_REVIEW_CLICK / PAGE_VIEW`. Division by zero yields 0%.
86. `GOOGLE_REVIEW_CLICK` is always labeled Google handoff, never review submission. No Google scraping or unverifiable submission event is introduced.
87. Subscription alerts use the single current subscription and mutually exclusive buckets: expired, today, within 3 days, within 7 days, and within 30 days.
88. Dashboard responses contain aggregate anonymous data and sanitized event activity only. Session identifiers, cookies, IP addresses, customer identity, answers, review text, secrets, and raw metadata are excluded.
89. Analytics ranges are capped at 367 days. Existing event type/time and business/type/time indexes are sufficient for V1 aggregation; no speculative index is added.
90. Production environment validation is activated by `VERCEL_ENV=production` or `APP_ENV=production`; it requires the final HTTPS origin, current-format Supabase configuration, rate-limit secret, and configured Gemini provider.
91. Gemini remains the production AI provider for V1. Its model and timeout are server-configurable, but raw provider errors and keys never reach customer responses or logs.
92. Shared abuse protection uses Supabase PostgreSQL rather than an additional vendor. Atomic fixed-window counters store only HMAC digests and are callable only with the secret-key client.
93. Public session creation, generation, and handoff fail closed in production when durable throttling is unavailable. Answer/completion/save progress may fail open while retaining all database validation and generation caps.
94. Public mutation API routes require the configured same origin in production. Admin Server Actions retain Next.js origin checks plus server authentication, application authorization, validation, RLS, and authorization-checking RPCs.
95. Production security headers use a Next-compatible CSP, deny framing/object embedding, minimize browser permissions and referrer leakage, prevent MIME sniffing, and add HSTS on production builds.
96. V1 observability uses structured redacted server logs and protected readiness. A third-party error tracker is deferred until operational need justifies the added data processor and configuration.
97. Production QR identity is not final until `NEXT_PUBLIC_APP_URL` is the confirmed public HTTPS origin. Final printed assets must not be distributed before domain and scan verification.
98. Applied production migrations are immutable. Backup/PITR capability must be confirmed before launch, and recovery is validated away from the live project using a new corrective migration when schema repair is needed.
99. Vercel Web Analytics is mounted globally for deployment-level visitor/page-view telemetry. It does not replace or alter the anonymous Supabase product-funnel analytics model.

## 2026-09-03 - Independent QR branding

Business Logo remains admin and public review identity. Optional QR Logo appears only inside the single permanent QR. Source priority: explicitly enabled Business Logo if present, then custom QR Logo, then plain QR. The toggle defaults to false and references the current Business Logo without copying it. Download or processing failures yield plain output; HEIC/HEIF uploads remain allowed even when decoding is unavailable.

The image occupies 14% of the width with white padding (16% total footprint). H error correction, black/white modules, quiet zone and finder patterns remain. PNG is 1600x1600; SVG embeds normalized PNG data. No variants, new tracking identities, or changes to the permanent /r/{slug} destination. Physical print checks remain required.

## Smart Links and dynamic payments

Review QR at `/r/[slug]` requires the existing valid Review subscription and active business. Smart Links QR at `/s/[slug]` requires only an existing ACTIVE business. `evaluateSmartLinksAvailability` never reads subscriptions: expired, suspended, cancelled or absent Review subscriptions do not affect Smart Links. Business SUSPENDED or ARCHIVED blocks both systems. Review availability, AI generation and Google handoff remain unchanged.

Active direct types are FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE and WEBSITE. Validate HTTPS and provider domains server-side; legacy unsupported rows remain stored but are excluded from admin selectors, public resolution and current analytics labels.

The main Smart Links list shows one Payment navigation item first when active payment methods exist, followed by direct links in their saved order. `/s/[slug]/payments` lists only active methods in payment order. Each opens the existing QR image modal with name and Close/Back. Empty states are shown when no direct links or methods are available. Provider names never appear as separate main-page items.

`business_payment_qrs` stores id, business_id, administrator-defined name (1–80 characters), required image_path, sort_order, is_active and timestamps. No provider enum, provider dropdown, URL or API configuration exists. Admins add, rename, replace images, remove, enable/disable and reorder in the existing Smart Links management page. `apply_payment_qr_action` requires ADMIN, locks the business, validates image ownership and commits ordering and audit records atomically. Unique business/order constraints prevent duplicates.

Migration `20260909000003_dynamic_payments.sql` copies existing image-bearing payment rows into generic methods, preserving IDs, business relationship, image paths, enabled state, sort_order and timestamps. Legacy rows without images stay stored but hidden. Older migrations and historical events are unchanged. Existing private QR objects retain their paths; new uploads use `{business_id}/{payment_method_id}/{random_uuid}.png` in the private `business-payment-qrs` bucket. Names never form storage paths. PNG/JPEG/WebP uploads are capped at 2 MiB and fully decoded; malformed/MIME-mismatched images are rejected. Images are normalized to PNG without cropping or resizing, with a 16-million-pixel cap and 2 MiB output cap.

Admin and public image handlers resolve the stored method under the requested business, never a client image URL/path. Public page, QR-view action and image retrieval all enforce active business and active method state, independently of subscriptions. Images are served private/no-store. ADMIN RLS and durable rate limits remain. No payment APIs, external payment redirects, amounts, transactions, customer PII or payment confirmation are implemented.

Smart analytics remain separate from Review analytics: SMART_PAGE_VIEW is a main page open; SMART_LINK_CLICK is a supported direct-link tap; PAYMENT_PAGE_VIEW is a nested payment page open; PAYMENT_QR_VIEW is a QR viewer open. New payment events carry business_id and, for QR views, payment_method_id; no customer identity is recorded. Payment IDs remain in historical events after method deletion. Aggregate QR views include earlier history; per-method counts use current generic IDs. No event implies payment initiation or success.

Both QR destinations remain permanent and retain existing logo configuration, PNG/SVG rendering and filenames. Subscription changes affect Review access only. Run lint, typecheck, build, audit, test:smart-links, test:payment-qrs and test:qr-branding; browser/device checks cover layout and actual scans.

Migration `20260909000004_payment_storage_path_policy.sql` qualifies the Storage object path inside the business ownership check. Live rollback integration checks are available via `supabase db query --linked --file scripts/test-dynamic-payments.sql`; fixtures leave no persisted data.
