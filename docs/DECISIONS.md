# Product and Architecture Decisions

This file is the V1 decision log. Changes should be recorded here before architecture or implementation drifts.

## Locked decisions

1. The temporary product name is **Smart Review QR**.
2. V1 has one central admin; architecture may support multiple admins later, but no multi-admin UI is planned now.
3. Business statuses are `ACTIVE`, `SUSPENDED`, and `ARCHIVED`.
4. Subscription statuses are `TRIAL`, `ACTIVE`, `EXPIRED`, `SUSPENDED`, and `CANCELLED`.
5. Subscription history is retained, with one current/effective subscription per business.
6. Trial architecture is supported with a default seven-day trial; admin may configure or skip it later.
7. Renewal durations are 1, 3, 6, or 12 months, plus custom expiry.
8. Timestamps are stored in UTC. Relevant subscription dates are displayed in `Asia/Kathmandu`.
9. Slugs become permanent after activation or QR use and never change automatically with display names.
10. Reserved slugs are `admin`, `login`, `api`, `auth`, `dashboard`, `settings`, and `r`.
11. The V1 public customer flow lives at `/r/[slug]`.
12. Businesses start with three questions, may have at most five, and each question may have at most six options.
13. V1 may store selected answers as structured JSON while retaining stable question and option IDs.
14. Each review session permits one initial AI generation and one regeneration, enforced server-side.
15. Only generated review text supports language selection: English or Nepali. The application is otherwise English and has no full i18n system.
16. AI providers are abstracted behind `generateReview()`: mock first, Gemini for development testing, and OpenAI later if selected.
17. Review text is generally 30–50 words, natural, concise, answer-grounded, and free of invented claims or excessive promotion/emojis.
18. Generated reviews are stored for debugging, history, and analytics without unnecessary customer PII.
19. Initial analytics events are `PAGE_VIEW`, `REVIEW_STARTED`, `REVIEW_GENERATED`, `REVIEW_REGENERATED`, and `GOOGLE_REVIEW_CLICK`; `REVIEW_EDITED` is optional. `QUESTION_COMPLETED` is excluded initially.
20. A Google click is not evidence that a review was submitted.
21. Business logos use Supabase Storage, allow PNG/JPG/JPEG/WebP, and are limited to 2 MB.
22. QR and NFC use the same permanent URL. NFC programming occurs outside the application.
23. Google handoff copies the review, records the click, and opens Google. No injection, auto-paste, browser automation, or automatic submission is permitted.
24. Both customer and admin experiences are permanently mobile-first for 360–430px viewports.
25. Public QR route performance has priority; caching must never make subscription state stale.
26. The security baseline includes Supabase Auth, RLS, server authorization, server subscription enforcement, Zod validation, server-only secrets, rate limiting, and minimal PII.
27. The preferred later deployment is Vercel plus Supabase. No production domain is required yet.
28. Phase 1 uses npm and defaults `AI_PROVIDER` to `mock`. Supabase, Vercel, and AI credentials are optional.
