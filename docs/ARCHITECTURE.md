# NexGen Digital — Architecture

## Stack

- Next.js App Router, TypeScript, and Tailwind CSS
- Supabase PostgreSQL, Auth, Storage, RLS, and versioned migrations
- Vercel as the later Next.js deployment target
- Provider-independent AI adapters

## Application boundaries

```text
Routes and UI
  → server actions / route handlers
  → application services
  → repositories
  → Supabase PostgreSQL
```

- `src/app` owns routes, layouts, and route handlers.
- `src/components/ui` contains reusable interface primitives.
- `src/features` groups product-specific code.
- `src/lib/supabase` owns browser, SSR, proxy, and privileged clients.
- `src/lib/auth` owns identity and admin-authorization helpers.
- `src/server/services` owns business workflows.
- `src/server/repositories` owns persistence access.
- `src/types/database.ts` mirrors the migration schema until types can be regenerated from an applied database.

Business logic must not live in presentation components. Client Components are limited to browser interactions.

## Supabase clients and keys

The browser and authenticated SSR clients use `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is expected to be visible and relies on RLS for data protection.

The privileged server client uses `SUPABASE_SECRET_KEY`, disables browser-style session persistence, imports `server-only`, and must be called only after application-level authorization. The secret key bypasses RLS and must never enter browser code, logs, URLs, or public documentation.

The root Next.js proxy refreshes Supabase Auth cookies via `getClaims()`. It becomes a no-op when Supabase public configuration is absent, preserving local foundation development.

## Authentication and authorization

Only admins authenticate. Supabase Auth establishes identity; an `admin_profiles` row with role `ADMIN` establishes application authorization. `getAdminAuthState()` distinguishes an anonymous request from an authenticated non-admin, `getCurrentAdmin()` resolves the profile, and `requireAdmin()` protects server-rendered admin features.

`/login` uses a server action to validate email/password input and call Supabase Auth. Successful authentication is followed immediately by an `admin_profiles` authorization query. Non-admin sessions are signed out and denied. Existing authorized sessions redirect directly to `/admin`.

The `/admin` layout performs identity and profile checks on the server for every nested admin route. Anonymous requests redirect to `/login`; authenticated users without an admin profile redirect to an unauthorized state on the login page. Logout invalidates the Supabase session, refreshes the route tree, and returns to `/login`.

The initial profile is provisioned by an idempotent version-controlled Node script. It uses the server-only secret key, verifies that the supplied Auth user exists, and upserts only the matching `ADMIN` profile. It contains no password or API key.

## Admin interface

The admin shell is designed for 360–430px first. Mobile uses a fixed, safe-area-aware bottom navigation with Home, Businesses, Activity, and More. Tablet and desktop progressively switch to a left sidebar while retaining the same information architecture. Businesses provides mobile-first management; Activity contains the privacy-safe cross-business review event feed.

## Business management

`/admin/businesses` renders a server-loaded, RLS-protected card list with name search and status filtering. Create, edit, detail, and lifecycle routes live under the same protected admin layout. Client Components are limited to form interaction, image preview, and confirmation dialogs; all reads use the authenticated SSR client and every mutation calls `requireAdmin()` before using that client.

Business slugs are normalized and validated before creation, including reserved names and uniqueness. Edit operations load the stored slug and never accept a replacement from the browser. Business lifecycle transitions are restricted to active → suspended/archived and suspended → active/archived. Archived is terminal in the admin application, and no hard-delete action exists.

Business mutations write corresponding audit events for creation, profile updates, Google URL changes, logo changes, suspension, reactivation, and archive.

## Subscription lifecycle and availability

`/admin/businesses/[id]/subscription` is the mobile-first subscription workspace. Server Components load the current subscription and append-only history through the authenticated RLS client. Confirmed client interactions submit to a server action that calls `requireAdmin()` and invokes the versioned `apply_subscription_action` database function.

The database function locks the business row to serialize concurrent changes. In one transaction it marks the previous current row non-current, inserts a new current history row, and writes the matching audit event. The partial unique index remains the final guarantee that only one current row exists per business.

Fixed-duration renewal is deterministic. If the current row is an unexpired `TRIAL` or `ACTIVE` subscription, the new expiry extends from its existing `expires_at`; otherwise the period starts from the current UTC instant. The new administrative record starts at the action time while retaining the calculated continuous expiry. Custom dates are interpreted as 23:59:59 in `Asia/Kathmandu` and stored as UTC.

`evaluateBusinessAvailability()` is the authoritative reusable rule boundary. A business is available only when its own status is `ACTIVE`, a current subscription exists, its status is `TRIAL` or `ACTIVE`, and `expires_at` is after the current UTC instant. It returns a sanitized reason: `ACTIVE`, `EXPIRED`, `SUSPENDED`, `CANCELLED`, `NO_SUBSCRIPTION`, `BUSINESS_SUSPENDED`, or `BUSINESS_ARCHIVED`. Public access will call this service later; it never depends on a scheduled expiry job or a stored `EXPIRED` status alone.

## Review-question management

`/admin/businesses/[id]/questions` is the mobile-first question workspace. Server Components load non-archived questions and ordered options through the authenticated RLS client. Client Components handle dialogs, move controls, and the local preview; every mutation passes through Zod-validated server actions and authenticated database functions.

Question and option mutations lock the owning business before changing state. Database functions enforce at most five active questions, at most six options per question, and at least two active options for every active question. Questions are created inactive so options can be configured safely before activation. Archiving is a soft delete using `archived_at` and disables the question.

Ordering uses integer `sort_order`, database uniqueness per parent, and atomic adjacent swaps. Admin input never writes arbitrary sort positions. The recommended template is created atomically only when the business has no non-archived questions, and remains fully editable afterward.

The admin-only mobile preview reads the current active questions/options and simulates stepping through answers in local component state. It does not enforce subscriptions, call AI, create review sessions, or navigate to Google.

## Public customer review flow

`/r/[slug]` is dynamic and subscription-sensitive. Every page request and session mutation resolves the business through a server-only privileged client, calls the shared availability rules, and then loads only active, non-archived questions with at least two active options. Missing, unavailable, and unconfigured businesses receive friendly customer states without subscription or admin details.

Starting creates a two-hour anonymous `review_sessions` row and an HttpOnly, same-site cookie containing only its opaque `anonymous_session_id`. Refresh restores an unexpired session. No customer identity or contact data is requested or stored.

Answers use `{ "question-uuid": "option-uuid" }`. The server accepts one question/option pair at a time, rechecks availability and current active configuration, rejects cross-business or inactive IDs, and caps answers at five. Labels and option values sent by a browser are never trusted.

The final step stores only `en` or `ne` in `generation_language`, validates that every current question has a valid answer, and marks the session complete. Generation then restores that session server-side, re-resolves every question and option label/value from the active database configuration, and never accepts prompt text from the browser.

Valid page visits record best-effort `PAGE_VIEW` events through a deduplicated visitor cookie. The first question is displayed immediately, without a start screen. Selecting the first answer starts the session before saving that answer; existing sessions resume their saved progress. A session records at most one `REVIEW_STARTED`, so viewing the questions alone does not count as a review start. Analytics failures never block the review flow, and no `QUESTION_COMPLETED` event exists.

## RLS strategy

RLS is enabled on every application table. `anon` receives no application-table privileges or policies. Authenticated users can access rows only when the security-definer `is_admin()` function confirms a matching admin profile. Public review operations will later use narrow server-side handlers rather than broad anonymous table policies.

The secret-key client bypasses RLS, so application authorization remains mandatory before privileged operations. RLS is defense in depth, not a replacement for server authorization.

## Storage strategy

`supabase/config.toml` defines the public `business-logos` bucket with a 2 MiB limit and PNG, JPEG, WebP, HEIC, and HEIF MIME allowlist. The versioned bucket configuration script applies matching settings to the hosted project. Storage object policies permit authenticated admins to manage only that bucket. Anonymous writes and listings are not allowed; public object URLs provide simple logo delivery.

Supabase Storage internals are not mutated directly in SQL. The bucket must be seeded locally or created with matching settings in the hosted project.

## Public flow

The later customer route is `/r/[slug]`. Server logic will resolve the business, verify status and the one current subscription, then return either the review experience or an unavailable state. Public operations will not trust client-submitted business identifiers.

## AI and analytics boundaries

Feature code calls the provider-independent `generateReview()` boundary. `MockProvider` is the key-free development default and produces grounded English or Nepali text through the same contract as `GeminiProvider`. Gemini uses the server-only key, a configurable 3–30 second timeout (15 seconds by default), normalized errors, and a configurable model (`gemini-3.5-flash-lite` by default). `OpenAIProvider` remains a non-operational compatibility stub.

Prompt construction is isolated from UI and versioned as `v1`. It receives only the server-resolved business name, question text, selected option label/value, and `en` or `ne`. Output normalization rejects empty, excessively short, or excessive responses before persistence.

The database atomically reserves and finalizes generation numbers under a session row lock. A session can have only one successful initial generation and one successful regeneration. Pending duplicate requests are rejected for 30 seconds, failed retries require a 10-second delay, and each generation number permits at most three provider attempts. This durable per-session protection works across application instances and is complemented by the shared database-backed coarse quota described below.

## Production security and reliability

Production startup validates the final HTTPS origin, HTTPS Supabase URL, current-format publishable and secret keys, a 32-character rate-limit HMAC secret, and the Gemini AI provider with its server-only key. Public variables contain only the application origin, Supabase URL, and publishable key; secret configuration is imported through `server-only` modules.

Public POST routes require an `Origin` matching the configured production origin. Development also permits the request's own origin for localhost and phone-on-LAN testing. Next.js provides origin validation for Server Actions; authenticated admin actions additionally require `requireAdmin()`, use UUID/schema validation, and rely on RLS or authorization-checking RPCs. There are no GET mutations or client-selected redirects.

`rate_limit_counters` provides atomic fixed-window limits across serverless instances. Request fingerprints are HMAC-SHA-256 digests derived from network/browser context; raw IPs, cookies, session IDs, and review text are not stored. Session creation, generation, and Google handoff fail closed in production if the durable limiter cannot be reached. Lower-risk progress saves fail open so temporary limiter trouble does not discard customer work; database validation and per-session generation limits still apply.

Global response headers deny framing and object embedding, restrict referrers and browser capabilities, disable MIME sniffing, and apply a Next-compatible CSP. Scripts and styles allow inline content required by the current Next.js runtime and Tailwind/style attributes. Images and connections allow the application and Supabase HTTPS origins. Production adds HSTS and insecure-request upgrading.

Server logs are newline-delimited JSON with event, severity, and timestamp. The logger drops context keys associated with cookies, tokens, passwords, secrets, session IDs, authorization, API keys, or review text and truncates strings. Expected provider failures are warnings with normalized codes; unexpected infrastructure failures are errors without raw Supabase, SQL, or provider payloads. Vercel logs are sufficient for V1; external error tracking is a future enhancement.

Vercel Web Analytics is mounted once in the root layout and provides deployment-level page-view/visitor telemetry. It is operational hosting analytics and remains separate from the application-owned Supabase funnel events and conversion formulas.

`/api/health` remains a dependency-free no-store liveness response. `/api/health/readiness` is disabled unless a server-only token is configured, compares bearer tokens in constant time, checks database reachability, and returns only `ready`, `not_ready`, or `unauthorized`.

Successful and failed attempts are stored in `review_generations` with provider, model, prompt version, input hash, language, attempt count, status, safe error code, and generated text when successful. `REVIEW_GENERATED` and `REVIEW_REGENERATED` are best-effort, unique per session/type, and recorded only after the corresponding successful generation. Analytics failures never discard a generated review.

## Google Review handoff

The generated-review screen keeps edits local while typing. Copy Review and Continue to Google are explicit customer actions; each checkpoints the current text to `review_generations.final_text` rather than persisting keystrokes. Refresh restores the latest generation’s finalized text when one exists, otherwise its original generated text.

Continue invokes clipboard access immediately within the tap, then calls a narrow server action. The server restores the HttpOnly session, rechecks expiry and business/subscription availability, selects the latest successful generation, validates the current business record’s Google URL, persists the final text, and returns only that stored URL. The browser never submits or chooses a redirect URL.

After a successful copy, the same tab navigates to Google following brief paste instructions. If clipboard access fails, the editable text remains visible and an explicit server-returned Open Google anyway link is shown. There is no DOM injection, auto-paste, automatic submission, popup flow, or claim that a review was posted.

An explicit Continue records best-effort `GOOGLE_REVIEW_CLICK`, meaning only that the customer initiated the validated Google handoff. A 30-second session-based deduplication bucket absorbs accidental repeated taps while allowing later retries. Analytics failure never blocks handoff.

## Permanent QR architecture

`buildBusinessReviewUrl()` is the single URL-construction boundary for QR management, business detail links, and future NFC tools. It validates the immutable stored slug, normalizes the configured `NEXT_PUBLIC_APP_URL`, permits only HTTP/HTTPS without credentials, query strings, or fragments, and produces `{base}/r/{slug}` with no tracking, subscription, customer, or secret data.

The lightweight `qrcode` encoder generates standard black-on-white codes with high (`H`) error correction and a four-module quiet zone. Admin preview uses server-generated SVG. Protected download handlers provide a 1600px PNG for common print use and SVG for lossless professional scaling with stable `nexgen-{slug}-qr` filenames.

`/admin/businesses/[id]/qr` and its download handler require admin authorization and resolve the business server-side. They accept only business ID and a `png`/`svg` format; no client-supplied URL can be encoded. Missing businesses, invalid identifiers/configuration, and generation errors receive safe states.

QR identity depends only on the permanent slug and configured public base URL—not display name, subscription, questions, or AI configuration. Expiry or suspension changes what `/r/[slug]` displays, while renewal reactivates the same printed QR. V1 NFC tags will encode the exact same URL and require no separate token, redirect service, or backend.

## Analytics dashboard

`/admin` presents platform-wide business, subscription, event, conversion, trend, alert, and sanitized recent-activity summaries. `/admin/businesses/[id]/analytics` scopes the same event semantics to one server-resolved business, with its business detail page showing only a lightweight 30-day preview.

The authenticated `get_platform_analytics` and `get_business_analytics` PostgreSQL functions perform counts, filters, daily grouping, and bounded recent-activity selection in the database. Each dashboard uses one aggregation call rather than loading unbounded event rows or issuing per-business queries. Existing `(event_type, created_at)` and `(business_id, event_type, created_at)` indexes support these access patterns.

The default range is the last 30 Kathmandu calendar days. Today, seven-day, thirty-day, and validated custom ranges are converted to UTC instants at the application boundary. PostgreSQL stores and filters `timestamptz` in UTC, then groups trend buckets by `Asia/Kathmandu` date so midnight boundaries match the admin’s displayed calendar.

Conversion formulas are `REVIEW_STARTED / PAGE_VIEW`, `REVIEW_GENERATED / REVIEW_STARTED`, `GOOGLE_REVIEW_CLICK / REVIEW_GENERATED`, and `GOOGLE_REVIEW_CLICK / PAGE_VIEW`. Zero denominators produce 0%. Google handoff remains an outbound click and is never labeled as a submitted review.

Analytics RPCs require `is_admin()`, run under authenticated RLS, cap ranges at 367 days, and expose only aggregate counts, business names/IDs for admin navigation, event types, and timestamps. They never return session identifiers, cookies, IP addresses, customer identity, answers, review text, or raw metadata.

Analytics is append-oriented and limited to approved event types. A Google click never represents a confirmed review submission.

## Time and performance

PostgreSQL stores `timestamptz` values in UTC. Subscription dates will later display in `Asia/Kathmandu`. Public QR routes have the highest performance priority, and caching must not leave subscription status stale.

## Separate business and QR branding

Each business now has two permanent QR purposes: Review QR at `/r/[slug]` and Smart Links QR at `/s/[slug]`. The branding rules below apply to both; destinations and download filenames remain distinct.

`logo_path` remains the Business Logo for admin identity and public review branding. Optional `qr_logo_path` is only the QR center image. `use_business_logo_for_qr` defaults to false: explicitly enabled + an existing Business Logo wins, otherwise the separate QR Logo wins, otherwise the QR is plain. Changing the Business Logo affects the QR only when explicitly selected. Removing the custom QR Logo follows the same priority.

The admin preview and existing PNG/SVG downloads share the renderer and resolve the business and storage object server-side. A single object download and bounded Sharp decode normalize the image into a white-padded PNG. Sharp was already a Next dependency and is now declared directly. Input is capped at 2 MiB and 16 million decoded pixels; unsupported HEIC/HEIF or corrupt/missing images fall back to plain QR. No processing occurs in the public review flow.

The logo is contained within 14% of QR width, plus 1% white padding per side. PNG remains 1600×1600; SVG embeds a PNG data URI and has no external image dependency. H error correction, black/white modules, four-module quiet zone and standard finders remain. Both permanent identities are independent of branding, link configuration, subscription, expiry or suspension.

## Smart Links and dynamic payments

Review QR at `/r/[slug]` requires the existing valid Review subscription and active business. Smart Links QR at `/s/[slug]` requires only an existing ACTIVE business. `evaluateSmartLinksAvailability` never reads subscriptions: expired, suspended, cancelled or absent Review subscriptions do not affect Smart Links. Business SUSPENDED or ARCHIVED blocks both systems. Review availability, AI generation and Google handoff remain unchanged.

Active direct types are FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE and WEBSITE. Validate HTTPS and provider domains server-side; legacy unsupported rows remain stored but are excluded from admin selectors, public resolution and current analytics labels.

Public direct-link names always come from the centralized `smartLinkLabels` type mapping. The legacy Smart Link `label` column is optional compatibility data: it is neither collected in the normal-link admin form nor rendered publicly. Payment method names remain administrator-defined.

The main Smart Links list shows one Payment navigation item first when active payment methods exist, followed by direct links in their saved order. `/s/[slug]/payments` lists only active methods in payment order. Each opens the existing QR image modal with name and Close/Back. Empty states are shown when no direct links or methods are available. Provider names never appear as separate main-page items.

`business_payment_qrs` stores id, business_id, administrator-defined name (1–80 characters), required image_path, sort_order, is_active and timestamps. No provider enum, provider dropdown, URL or API configuration exists. Admins add, rename, replace images, remove, enable/disable and reorder in the existing Smart Links management page. `apply_payment_qr_action` requires ADMIN, locks the business, validates image ownership and commits ordering and audit records atomically. Unique business/order constraints prevent duplicates.

Migration `20260909000003_dynamic_payments.sql` copies existing image-bearing payment rows into generic methods, preserving IDs, business relationship, image paths, enabled state, sort_order and timestamps. Legacy rows without images stay stored but hidden. Older migrations and historical events are unchanged. Existing private QR objects retain their paths; new uploads use `{business_id}/{payment_method_id}/{random_uuid}.png` in the private `business-payment-qrs` bucket. Names never form storage paths. PNG/JPEG/WebP uploads are capped at 2 MiB and fully decoded; malformed/MIME-mismatched images are rejected. Images are normalized to PNG without cropping or resizing, with a 16-million-pixel cap and 2 MiB output cap.

Admin and public image handlers resolve the stored method under the requested business, never a client image URL/path. Public page, QR-view action and image retrieval all enforce active business and active method state, independently of subscriptions. Images are served private/no-store. ADMIN RLS and durable rate limits remain. No payment APIs, external payment redirects, amounts, transactions, customer PII or payment confirmation are implemented.

Smart analytics remain separate from Review analytics: SMART_PAGE_VIEW is a main page open; SMART_LINK_CLICK is a supported direct-link tap; PAYMENT_PAGE_VIEW is a nested payment page open; PAYMENT_QR_VIEW is a QR viewer open. New payment events carry business_id and, for QR views, payment_method_id; no customer identity is recorded. Payment IDs remain in historical events after method deletion. Aggregate QR views include earlier history; per-method counts use current generic IDs. No event implies payment initiation or success.

Both QR destinations remain permanent and retain existing logo configuration, PNG/SVG rendering and filenames. Subscription changes affect Review access only. Run lint, typecheck, build, audit, test:smart-links, test:payment-qrs and test:qr-branding; browser/device checks cover layout and actual scans.

Migration `20260909000004_payment_storage_path_policy.sql` qualifies the Storage object path inside the business ownership check. Live rollback integration checks are available via `supabase db query --linked --file scripts/test-dynamic-payments.sql`; fixtures leave no persisted data.
