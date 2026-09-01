# Boostup AI Smart QR — Project Context

## Product

Boostup AI Smart QR is a subscription-based Google Review automation SaaS from Boostup. One central admin manages multiple businesses. Each business receives a permanent URL at `/r/[slug]`, encoded in both QR codes and NFC tags.

An anonymous customer answers multiple-choice questions, selects English or Nepali for the generated review, and receives a concise AI-assisted review grounded only in those answers. The customer may edit it and regenerate once. Continuing copies the review and opens the business's Google Review URL.

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
- Mobile-first editable generated-review result with polished loading/retry states and an explicit future Google-handoff placeholder.
- Permanent, reserved-word-protected business slugs and server-validated Google Review URLs.
- Public business-logo bucket configuration for PNG, JPEG, WebP, HEIC, and HEIF up to 2 MiB, with admin-only writes.
- `GET /api/health`, independent of Supabase and AI.

## V1 exclusions

No payment gateway, recurring billing, business-specific admin accounts, customer accounts, social links, marketing automation, advanced CRM, direct Google review posting, or unsupported Google manipulation is in scope.

QR generation, analytics dashboards, Google handoff, online payments, recurring billing, reminders, and deployment are not implemented yet. Phase 8 generates and locally edits review text but does not copy it, redirect to Google, or persist edited keystrokes.
