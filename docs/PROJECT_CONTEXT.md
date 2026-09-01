# Smart Review QR — Project Context

## Product

Smart Review QR is a subscription-based Google Review automation SaaS. One central admin manages multiple businesses. Each business receives a permanent URL at `/r/[slug]`, encoded in both QR codes and NFC tags.

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
- Public business-logo bucket configuration for PNG, JPEG, and WebP up to 2 MiB.
- `GET /api/health`, independent of Supabase and AI.

## V1 exclusions

No payment gateway, recurring billing, business-specific admin accounts, customer accounts, social links, marketing automation, advanced CRM, direct Google review posting, or unsupported Google manipulation is in scope.

Business CRUD, subscription UI, customer review UI, QR generation, AI providers, analytics UI, Google handoff, and deployment are not implemented yet.
