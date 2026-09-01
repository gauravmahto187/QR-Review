# Database Direction

No database migration or Supabase connection is included in Phase 1. This document records the approved direction for a later database phase.

## Planned entities

- `admin_profiles`: profile and future-extensible role information for authenticated admins.
- `businesses`: display information, permanent unique slug, Google Review URL, branding, and business status.
- `subscriptions`: immutable history of trial, activation, renewal, suspension, expiry, and cancellation periods, with one effective subscription per business.
- `review_questions`: ordered, enabled/disabled business-specific questions.
- `review_question_options`: ordered, enabled/disabled options, limited to six per question.
- `review_sessions`: anonymous customer sessions, language, selected answers as structured JSON, and server-enforced generation counts.
- `review_generations`: stored initial and regenerated text, provider/model metadata, prompt version, status, and timestamps.
- `analytics_events`: append-oriented anonymous events.
- `audit_logs`: important central-admin actions and changes.

## Approved constraints

- Use UUID primary keys where appropriate.
- Store timestamps in UTC and display relevant subscription dates in `Asia/Kathmandu`.
- Business status is `ACTIVE`, `SUSPENDED`, or `ARCHIVED`.
- Subscription status is `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, or `CANCELLED`.
- A business has one effective subscription at a time while retaining history.
- Business slugs are unique and become permanent after activation or QR use.
- Reserved slugs include `admin`, `login`, `api`, `auth`, `dashboard`, `settings`, and `r`.
- Default questions: 3; maximum questions: 5; maximum options per question: 6.
- Review-session answers may use structured JSON in V1 while preserving question and option identifiers for future analytics.
- Store generated reviews but no unnecessary customer personal information.

## Expected indexes

Later migrations should consider unique business slug lookup, subscription status/expiry, effective subscription resolution, analytics by business and timestamp, and generation history by business and timestamp.

The final schema, constraints, indexes, RLS policies, and migration SQL must be reviewed during the database phase rather than inferred from this document alone.
