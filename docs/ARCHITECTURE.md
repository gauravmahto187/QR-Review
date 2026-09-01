# Boostup AI Smart QR — Architecture

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

The admin shell is designed for 360–430px first. Mobile uses a fixed, safe-area-aware bottom navigation with Home, Businesses, Reviews, and More. Tablet and desktop progressively switch to a left sidebar while retaining the same information architecture. Businesses provides mobile-first management; Reviews remains a protected placeholder.

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

Valid page visits record best-effort `PAGE_VIEW` events through a deduplicated visitor cookie. A session records at most one `REVIEW_STARTED`. Analytics failures never block the review flow, and no `QUESTION_COMPLETED` event exists.

## RLS strategy

RLS is enabled on every application table. `anon` receives no application-table privileges or policies. Authenticated users can access rows only when the security-definer `is_admin()` function confirms a matching admin profile. Public review operations will later use narrow server-side handlers rather than broad anonymous table policies.

The secret-key client bypasses RLS, so application authorization remains mandatory before privileged operations. RLS is defense in depth, not a replacement for server authorization.

## Storage strategy

`supabase/config.toml` defines the public `business-logos` bucket with a 2 MiB limit and PNG, JPEG, WebP, HEIC, and HEIF MIME allowlist. The versioned bucket configuration script applies matching settings to the hosted project. Storage object policies permit authenticated admins to manage only that bucket. Anonymous writes and listings are not allowed; public object URLs provide simple logo delivery.

Supabase Storage internals are not mutated directly in SQL. The bucket must be seeded locally or created with matching settings in the hosted project.

## Public flow

The later customer route is `/r/[slug]`. Server logic will resolve the business, verify status and the one current subscription, then return either the review experience or an unavailable state. Public operations will not trust client-submitted business identifiers.

## AI and analytics boundaries

Feature code calls the provider-independent `generateReview()` boundary. `MockProvider` is the key-free development default and produces grounded English or Nepali text through the same contract as `GeminiProvider`. Gemini uses the server-only key, a 15-second timeout, normalized errors, and the cost-efficient `gemini-2.5-flash-lite` model. `OpenAIProvider` remains a non-operational compatibility stub.

Prompt construction is isolated from UI and versioned as `v1`. It receives only the server-resolved business name, question text, selected option label/value, and `en` or `ne`. Output normalization rejects empty, excessively short, or excessive responses before persistence.

The database atomically reserves and finalizes generation numbers under a session row lock. A session can have only one successful initial generation and one successful regeneration. Pending duplicate requests are rejected for 30 seconds, failed retries require a 10-second delay, and each generation number permits at most three provider attempts. This durable per-session protection works across application instances; production hardening should add a shared coarse IP/provider quota before public launch.

Successful and failed attempts are stored in `review_generations` with provider, model, prompt version, input hash, language, attempt count, status, safe error code, and generated text when successful. `REVIEW_GENERATED` and `REVIEW_REGENERATED` are best-effort, unique per session/type, and recorded only after the corresponding successful generation. Analytics failures never discard a generated review.

Analytics is append-oriented and limited to approved event types. A Google click never represents a confirmed review submission.

## Time and performance

PostgreSQL stores `timestamptz` values in UTC. Subscription dates will later display in `Asia/Kathmandu`. Public QR routes have the highest performance priority, and caching must not leave subscription status stale.
