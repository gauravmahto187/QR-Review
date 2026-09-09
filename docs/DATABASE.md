# Boostup AI Smart QR — Database

The V1 schema is versioned in `supabase/migrations` and applied to the configured hosted Supabase project.

## Entities

- `admin_profiles`: links `auth.users` identities to application role `ADMIN`.
- `businesses`: permanent slug, display data, required Google Maps destination (stored in the existing `google_review_url` column), branding, and status.
- `subscriptions`: append-style subscription history with an explicit `is_current` marker.
- `review_questions`: ordered business-specific questions.
- `review_question_options`: ordered options belonging to questions.
- `review_sessions`: anonymous session ID, JSONB selected answers, generation language, and regeneration count.
- `review_generations`: stored generation attempts, provider/model metadata, language, status, and output/error.
- `analytics_events`: approved anonymous product events and small JSONB metadata.
- `audit_logs`: important admin actions.
- `rate_limit_counters`: service-role-only atomic abuse counters keyed by irreversible HMAC digests.

There is no `review_answers` table in V1. `review_sessions.answers` is a JSON object that must preserve stable question and option IDs, allowing normalization or question-level analytics later.

## Enums

- Admin role: `ADMIN`
- Business status: `ACTIVE`, `SUSPENDED`, `ARCHIVED`
- Subscription status: `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, `CANCELLED`
- Generation language: `en`, `ne`
- Generation status: `PENDING`, `SUCCEEDED`, `FAILED`
- Analytics events: `PAGE_VIEW`, `REVIEW_STARTED`, `REVIEW_GENERATED`, `REVIEW_REGENERATED`, optional `REVIEW_EDITED`, and `GOOGLE_REVIEW_CLICK`

`QUESTION_COMPLETED` is intentionally absent.

## Subscription history

Subscription rows are retained. A partial unique index allows only one row with `is_current = true` per business. `apply_subscription_action` serializes each business with a row lock, marks the previous row non-current, inserts a new current row, and writes its audit event atomically. Start and expiry use UTC `timestamptz`, and expiry must be later than start.

An unexpired trial or active renewal extends from the current expiry. Expired, suspended, cancelled, or absent subscriptions calculate a new fixed-duration period from the current UTC instant. Custom expiry dates represent the end of the selected Nepal calendar date and are converted to UTC before insertion.

Runtime validity always compares `expires_at` with the current UTC time. A row whose stored status is `TRIAL` or `ACTIVE` is immediately treated as effectively `EXPIRED` once its expiry passes; no scheduled normalization job is required. Admin history displays the effective state while preserving the stored historical record.

## Integrity and deletion

- UUID primary keys and foreign keys are used throughout.
- Businesses are archived in normal operation; history-bearing relationships restrict physical deletion.
- Question options cascade with questions, and questions cascade if a business is deliberately removed.
- Generation and analytics session/business composite foreign keys prevent mismatched business identifiers.
- Generation number is constrained to 1 or 2; regeneration count is constrained to 0 or 1.
- Generation reservations are serialized by the session row. A unique session/generation number constraint and service-role-only reserve/finalize functions prevent concurrent limit bypass.
- JSONB answers and metadata must be objects.
- `updated_at` triggers cover mutable records.
- Review questions use `archived_at` for safe removal and are excluded from active management/preview.
- Unique `(business_id, sort_order)` and `(question_id, sort_order)` indexes prevent unstable question and option ordering.
- Option values are unique case-insensitively within a question.

## Review-question rules

Authenticated database functions serialize changes by locking the owning business. They enforce five active questions per business, six total options per question, and at least two active options for an active question. New individual questions start inactive. Disabling an option is rejected when it would leave an active question with fewer than two active options.

The default template inserts three active questions and their options in one transaction only when no non-archived questions exist. Reorder operations use adjacent atomic swaps; clients cannot submit arbitrary sort orders.

## Anonymous public sessions

Public review sessions contain a generated anonymous UUID, business ID, object-shaped answers, generation language, timestamps, expiry, and regeneration count. Phase 7 sessions expire after two hours. Answers map validated question UUIDs to validated option UUIDs and are limited by the five-question configuration ceiling. No name, email, phone, Google identity, or customer profile is stored.

`analytics_events.dedupe_key` supports lightweight page-view deduplication. A partial unique index permits only one `REVIEW_STARTED` event per non-null session ID. Analytics remains append-oriented and failures are non-blocking for customers.

## Review generations

`review_generations` persists both successful output and normalized failures. It stores session/business IDs, provider, model, prompt version, SHA-256 input hash, generation number, language, status, generated text or safe error code, attempt count, and last-attempt time. API keys and raw provider responses are never stored.

`final_text` and `finalized_at` checkpoint the customer’s current edited version only when Copy Review or Continue to Google is explicitly selected. Original AI output remains unchanged in `generated_text`. Final text is limited to 1–1,200 trimmed characters and may exist only on a successful generation.

`reserve_review_generation` and `finish_review_generation` are executable only by the service role. Reservation validates an unexpired completed session and matching language, locks it, assigns generation 1 or 2, rejects in-flight/rate-limited/exhausted requests, and caps retries. Finalization changes only a pending record and sets `regeneration_count` after generation 2 succeeds.

Partial unique analytics indexes allow at most one `REVIEW_GENERATED` and one `REVIEW_REGENERATED` event per session. These events are written only after successful persistence.

`GOOGLE_REVIEW_CLICK` uses a unique 30-second session/time-bucket deduplication key. Its metadata says `customer_sent_to_google`; it is an outbound-handoff event and never represents a confirmed Google submission.

## Analytics aggregation

`get_platform_analytics(from, to)` returns current business-status counts, current subscription alert buckets, selected-range event counts, Kathmandu daily trend buckets, and at most eight sanitized recent events. Subscription alerts classify expired, expires today, within 3 days, within 7 days, and within 30 days, with one current row per business.

`get_business_analytics(business_id, from, to)` applies the same event counts and Kathmandu trend logic to one business. Both stable functions require an authenticated `ADMIN`, reject invalid or greater-than-367-day ranges, and rely on RLS plus the existing analytics time/business indexes. They do not return raw event metadata or session IDs.

Dashboard queries aggregate `PAGE_VIEW`, `REVIEW_STARTED`, `REVIEW_GENERATED`, `REVIEW_REGENERATED`, and `GOOGLE_REVIEW_CLICK`. `QUESTION_COMPLETED` and unverifiable review-submission events do not exist.

## Indexes

Indexes support slug lookup, current/expiring subscriptions, ordered questions/options, session and generation history, analytics by business/type/time, bounded dashboard aggregation, and audit history.

## Security

All application tables have RLS enabled. Anonymous database access is revoked. Authenticated table access requires `is_admin()`. Server-controlled public operations use the privileged client only after validation, rate limiting, and business/subscription checks.

## Business lifecycle and audit

Business slugs have a database unique constraint and are treated as immutable after creation by the application. `ARCHIVED` rows require `archived_at`; active and suspended rows require it to be null. The admin application exposes no physical delete operation. Business management records `BUSINESS_CREATED`, `BUSINESS_UPDATED`, `GOOGLE_REVIEW_URL_CHANGED`, `BUSINESS_LOGO_CHANGED`, `BUSINESS_SUSPENDED`, `BUSINESS_REACTIVATED`, and `BUSINESS_ARCHIVED` events in `audit_logs`.

Subscription management records `SUBSCRIPTION_TRIAL_STARTED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_EXTENDED`, `SUBSCRIPTION_CUSTOM_EXPIRY_SET`, `SUBSCRIPTION_SUSPENDED`, `SUBSCRIPTION_REACTIVATED`, and `SUBSCRIPTION_CANCELLED`. Metadata contains only operational fields such as plan, status, duration, timestamps, and previous subscription identifiers.

Question management records `REVIEW_QUESTION_CREATED`, `REVIEW_QUESTION_UPDATED`, `REVIEW_QUESTION_ENABLED`, `REVIEW_QUESTION_DISABLED`, `REVIEW_QUESTION_ARCHIVED`, `REVIEW_QUESTION_REORDERED`, `REVIEW_OPTION_CREATED`, `REVIEW_OPTION_UPDATED`, `REVIEW_OPTION_ENABLED`, `REVIEW_OPTION_DISABLED`, `REVIEW_OPTION_REORDERED`, and `DEFAULT_REVIEW_QUESTIONS_CREATED`.

## Durable abuse counters

`consume_rate_limit(scope, key_hash, limit, window_seconds)` atomically resets or increments one fixed-window row. It accepts only a 64-character lowercase SHA-256 digest, bounded limits/windows, and a service-role JWT. The table has RLS enabled, no anonymous or authenticated grants/policies, and stores no raw network, cookie, anonymous-session, or customer-content values. The composite primary key supports the complete lookup; no scanning is required.

## Backup and recovery

Migrations are the authoritative schema history and must remain source-controlled. Supabase production backup/PITR availability depends on the selected project plan and must be confirmed before launch. Before a release, verify local and remote versions with `npx supabase migration list`, dry-run pending changes, and take or confirm an appropriate backup.

Recovery must begin with identifying the affected project, timestamp, migration state, and backup/PITR point. Restore into a separate project or follow Supabase's reviewed recovery process, validate data and RLS there, then switch traffic deliberately. Never edit, reorder, or replace a production migration that has already been applied; create a new corrective migration. Destructive recovery testing is prohibited against the live project.

## TypeScript types

`src/types/database.ts` matches the applied schema through Phase 12. Regenerate types from the linked database after future migrations and review the diff before replacing the checked-in file.

## QR persistence

QR images are deterministic derivatives of the existing permanent business slug and configured application base URL. No QR blob, dynamic redirect token, subscription snapshot, tracking parameter, or additional QR database table is stored. Changing a display name leaves the encoded URL unchanged; changing a slug outside supported application behavior would invalidate printed assets.

## Timezone

All database timestamps use `timestamptz` and are stored as UTC instants. Nepal formatting belongs in the application using `Asia/Kathmandu`; local Nepal timestamps are never written directly as storage conventions.

## QR branding columns

New migration `20260903000001_business_qr_branding.sql` adds nullable `businesses.qr_logo_path` and non-null `businesses.use_business_logo_for_qr` (default false). Existing `logo_path` remains the Business Logo. Apply the new migration before deploying application code; existing rows keep plain QR behavior. TypeScript Row/Insert/Update definitions include both columns. Old migrations are unchanged.

QR uploads use the existing `business-logos` bucket with unique business-ID-prefixed object names. Existing public image delivery and admin-only storage mutation policies are unchanged; QR logos are branding assets, not confidential files. Authenticated server actions validate the same PNG/JPEG/WebP/HEIC/HEIF MIME allowlist and 2 MiB per-file maximum. The server-action request limit is 5 MiB to accommodate two 2 MiB files plus form overhead. Upload failures clean up new objects; successful replacement/removal deletes the previous custom object. The checkbox references the current business logo dynamically rather than copying its storage path.

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
