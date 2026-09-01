# Database

The V1 schema is versioned in `supabase/migrations`. It has not been pushed to a hosted project.

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
- Generation status: `SUCCEEDED`, `FAILED`
- Analytics events: `PAGE_VIEW`, `REVIEW_STARTED`, `REVIEW_GENERATED`, `REVIEW_REGENERATED`, optional `REVIEW_EDITED`, and `GOOGLE_REVIEW_CLICK`

`QUESTION_COMPLETED` is intentionally absent.

## Subscription history

Subscription rows are retained. A partial unique index allows only one row with `is_current = true` per business. Renewals must run in a transaction that marks the previous row non-current and inserts the new current row. Start and expiry use UTC `timestamptz`, and expiry must be later than start.

## Integrity and deletion

- UUID primary keys and foreign keys are used throughout.
- Businesses are archived in normal operation; history-bearing relationships restrict physical deletion.
- Question options cascade with questions, and questions cascade if a business is deliberately removed.
- Generation and analytics session/business composite foreign keys prevent mismatched business identifiers.
- Generation number is constrained to 1 or 2; regeneration count is constrained to 0 or 1.
- JSONB answers and metadata must be objects.
- `updated_at` triggers cover mutable records.

## Indexes

Indexes support slug lookup, current/expiring subscriptions, ordered questions/options, session and generation history, analytics by business/type/time, and audit history.

## Security

All application tables have RLS enabled. Anonymous database access is revoked. Authenticated table access requires `is_admin()`. Server-controlled public operations will use the privileged client only after validation, rate limiting, and business/subscription checks.

## TypeScript types

`src/types/database.ts` matches these migrations for Phase 2. Once a local or hosted database is available, regenerate types from the applied schema and review the diff before replacing the checked-in file.

## Timezone

All database timestamps use `timestamptz` and are stored as UTC instants. Nepal formatting belongs in the application using `Asia/Kathmandu`; local Nepal timestamps are never written directly as storage conventions.
