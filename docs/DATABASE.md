# Boostup AI Smart QR — Database

The V1 schema is versioned in `supabase/migrations` and applied to the configured hosted Supabase project.

## Entities

- `admin_profiles`: links `auth.users` identities to application role `ADMIN`.
- `businesses`: permanent slug, display data, Google Review URL, branding, and status.
- `subscriptions`: append-style subscription history with an explicit `is_current` marker.
- `review_questions`: ordered business-specific questions.
- `review_question_options`: ordered options belonging to questions.
- `review_sessions`: anonymous session ID, JSONB selected answers, generation language, and regeneration count.
- `review_generations`: stored generation attempts, provider/model metadata, language, status, and output/error.
- `analytics_events`: approved anonymous product events and small JSONB metadata.
- `audit_logs`: important admin actions.

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

`reserve_review_generation` and `finish_review_generation` are executable only by the service role. Reservation validates an unexpired completed session and matching language, locks it, assigns generation 1 or 2, rejects in-flight/rate-limited/exhausted requests, and caps retries. Finalization changes only a pending record and sets `regeneration_count` after generation 2 succeeds.

Partial unique analytics indexes allow at most one `REVIEW_GENERATED` and one `REVIEW_REGENERATED` event per session. These events are written only after successful persistence.

## Indexes

Indexes support slug lookup, current/expiring subscriptions, ordered questions/options, session and generation history, analytics by business/type/time, and audit history.

## Security

All application tables have RLS enabled. Anonymous database access is revoked. Authenticated table access requires `is_admin()`. Server-controlled public operations use the privileged client only after validation, rate limiting, and business/subscription checks.

## Business lifecycle and audit

Business slugs have a database unique constraint and are treated as immutable after creation by the application. `ARCHIVED` rows require `archived_at`; active and suspended rows require it to be null. The admin application exposes no physical delete operation. Business management records `BUSINESS_CREATED`, `BUSINESS_UPDATED`, `GOOGLE_REVIEW_URL_CHANGED`, `BUSINESS_LOGO_CHANGED`, `BUSINESS_SUSPENDED`, `BUSINESS_REACTIVATED`, and `BUSINESS_ARCHIVED` events in `audit_logs`.

Subscription management records `SUBSCRIPTION_TRIAL_STARTED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_EXTENDED`, `SUBSCRIPTION_CUSTOM_EXPIRY_SET`, `SUBSCRIPTION_SUSPENDED`, `SUBSCRIPTION_REACTIVATED`, and `SUBSCRIPTION_CANCELLED`. Metadata contains only operational fields such as plan, status, duration, timestamps, and previous subscription identifiers.

Question management records `REVIEW_QUESTION_CREATED`, `REVIEW_QUESTION_UPDATED`, `REVIEW_QUESTION_ENABLED`, `REVIEW_QUESTION_DISABLED`, `REVIEW_QUESTION_ARCHIVED`, `REVIEW_QUESTION_REORDERED`, `REVIEW_OPTION_CREATED`, `REVIEW_OPTION_UPDATED`, `REVIEW_OPTION_ENABLED`, `REVIEW_OPTION_DISABLED`, `REVIEW_OPTION_REORDERED`, and `DEFAULT_REVIEW_QUESTIONS_CREATED`.

## TypeScript types

`src/types/database.ts` matches these migrations for Phase 2. Once a local or hosted database is available, regenerate types from the applied schema and review the diff before replacing the checked-in file.

## Timezone

All database timestamps use `timestamptz` and are stored as UTC instants. Nepal formatting belongs in the application using `Asia/Kathmandu`; local Nepal timestamps are never written directly as storage conventions.
