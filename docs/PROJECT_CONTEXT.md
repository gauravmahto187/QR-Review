# Boostup AI Smart QR — Project Context

## Product

Boostup AI Smart QR is a subscription-based Google Review automation SaaS from Boostup. One central admin manages multiple businesses. Each business receives a permanent URL at `/r/[slug]`, encoded in both QR codes and NFC tags.

An anonymous customer answers multiple-choice questions, selects English or Nepali for the generated review, and receives a concise AI-assisted review grounded only in those answers. The customer may edit it and regenerate once. Continuing copies the review and opens the business's Google Maps link.

The application never injects text into Google, auto-pastes, automates a browser, or claims that a Google review was submitted. `GOOGLE_REVIEW_CLICK` means only that the customer was sent to Google.

## Users

- **Admin:** one authenticated central V1 admin. The schema supports additional admin profiles later, but there is no multi-admin interface.
- **Customer:** anonymous, has no account, and enters through QR or NFC.

There are no business-admin or customer accounts in V1.

## Permanent requirements

- Mobile-first at 360–430px for both admin and customer experiences.
- Permanent business slugs that do not change with display names.
- Server-enforced business and subscription availability.
- Provider-independent AI generation with `MockProvider` first.
- Anonymous analytics without unnecessary customer personal information.
- Fast public QR pages with minimal client JavaScript.
- Production-oriented validation, RLS, auditability, and error handling.

## Implemented foundation

- Next.js App Router, TypeScript, Tailwind CSS, and ESLint.
- Supabase browser, cookie-aware SSR, and privileged server clients.
- Versioned V1 schema, indexes, constraints, RLS policies, and Storage policies.
- Central-admin email/password login, logout, and server-protected `/admin` routes.
- An idempotent secret-key provisioning script for the initial existing Auth user.
- Mobile-first admin shell with Home, Businesses, Reviews, and More navigation.
- Mobile-first business list, search/status filters, create/edit/detail flows, and lifecycle actions.
- Mobile-first subscription management with trial, fixed-duration, custom-expiry, suspend, reactivate, cancel, and read-only history flows.
- Immediate server-enforced business availability based on business status, current subscription state, and UTC expiry.
- Mobile-first review-question and option management with stable ordering, safe archive, validated active-state limits, defaults, and an admin-only customer-flow preview.
- Permanent public `/r/[slug]` customer flow with live availability enforcement, anonymous session progress, validated answer IDs, language selection, and non-blocking start/page-view analytics.
- Provider-independent server-side review generation with realistic key-free mock output, optional Gemini output, versioned prompts, English/Nepali support, persisted attempts, one regeneration, and durable per-session limits.
- Mobile-first editable generated-review result with polished loading, retry, clipboard, and Google-handoff states.
- Customer-controlled Open Google Maps handoff with checkpointed edits, clipboard copy and fallback, validated business-owned destinations, and non-blocking outbound-click analytics.
- Permanent per-business QR management with authenticated preview, copyable public URL, print-quality PNG/SVG downloads, and subscription-independent scan identity.
- Mobile-first platform and per-business analytics with real event counts, conversion rates, Kathmandu trends, subscription alerts, sanitized recent activity, and authenticated server-side aggregation.
- Permanent, reserved-word-protected business slugs and required server-validated Google Maps links, with direct Google review links also supported.
- Public business-logo bucket configuration for PNG, JPEG, WebP, HEIC, and HEIF up to 2 MiB, with admin-only writes.
- `GET /api/health`, independent of Supabase and AI.
- Production environment invariants, configurable Gemini timeout/model, durable cross-instance public rate limiting, same-origin public mutations, security headers, redacted structured logs, and protected database readiness.
- Mobile safe-area, reduced-motion, focus, logo fallback/dimension, and friendly admin error handling refinements.

## Production readiness status

The codebase is prepared for a Vercel/Supabase production release but has not been deployed. The final domain, Vercel project, production environment values, Gemini key/provider test, Supabase backup/PITR plan, and hands-on mobile/regression acceptance must be completed before approval to deploy. Permanent QR URLs remain origin-dependent, so production QR files must not be printed until the final domain and deployed scan flow are verified.

## V1 exclusions

No payment gateway, recurring billing, business-specific admin accounts, customer accounts, social links, marketing automation, advanced CRM, direct Google review posting, or unsupported Google manipulation is in scope.

Online payments, recurring billing, scheduled reports, email reports, reminders, NFC writer UI, external analytics, and deployment are not implemented yet. QR codes are permanent derived assets rather than dynamic tracking redirects. Google handoff requires explicit customer action and never auto-pastes, injects text, submits a review, or claims a submission occurred.
