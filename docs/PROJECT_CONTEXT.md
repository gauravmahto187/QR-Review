# NexGen Digital — Project Context

## Product

NexGen Digital is a subscription-based Google Review automation SaaS. One central admin manages multiple businesses. Each business receives a permanent URL at `/r/[slug]`, encoded in both QR codes and NFC tags.

An anonymous customer answers multiple-choice questions, selects English or Nepali for the generated review, and receives a concise AI-assisted review grounded only in those answers. The customer may edit it and regenerate once. Continuing copies the review and opens the business's Google Maps link.

The application never injects text into Google, auto-pastes, automates a browser, or claims that a Google review was submitted. `GOOGLE_REVIEW_CLICK` means only that the customer was sent to Google.

## Users

- **Admin:** one authenticated central V1 admin. The schema supports additional admin profiles later, but there is no multi-admin interface.
- **Customer:** anonymous, has no account, and enters through QR or NFC.

There are no business-admin or customer accounts in V1.

## Permanent requirements

- Mobile-first at 360–430px for both admin and customer experiences.
- Permanent business slugs that do not change with display names.
- Review access requires a valid subscription; Smart Links requires only an active business.
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
- Mobile-first admin shell with Home, Businesses, Activity, and More navigation.
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

## QR branding enhancement (2026-09-03)

Create/Edit Business separates Business Logo from optional QR Logo, with custom upload/replace/remove and an explicit Use Business Logo for QR toggle. Business detail displays Custom / Using Business Logo / None. Business Logo continues to brand admin and public review pages. QR source priority is explicitly selected Business Logo if present, then custom QR Logo, then plain. Unsupported or broken images fall back to plain output.

Preview and protected downloads use the same server-resolved image and permanent /r/{slug} URL. PNG is 1600x1600; SVG is self-contained. Subscription, analytics, public review, AI, Google handoff, auth and RLS behavior are unchanged. Apply migration 20260903000001_business_qr_branding.sql before deploying application code.

Run npm run test:qr-branding for source-priority checks A-H, 36 PNG/SVG decoder checks across short/max-length slugs and nine image/fallback fixtures, plus mocked create/edit/remove, validation and storage-failure tests. Live authenticated Supabase CRUD and physical print checks still need deployment validation.

## Smart Links and dynamic payments

Review QR at `/r/[slug]` requires the existing valid Review subscription and active business. Smart Links QR at `/s/[slug]` requires only an existing ACTIVE business. `evaluateSmartLinksAvailability` never reads subscriptions: expired, suspended, cancelled or absent Review subscriptions do not affect Smart Links. Business SUSPENDED or ARCHIVED blocks both systems. Review availability, AI generation and Google handoff remain unchanged.

Active direct types are FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE and WEBSITE. Validate HTTPS and provider domains server-side; legacy unsupported rows remain stored but are excluded from admin selectors, public resolution and current analytics labels.

Direct links display only their canonical type names (Facebook, Instagram, TikTok, YouTube, Website); the historical label field is retained but unused in the direct-link form and public page. Payment method names remain administrator-defined.

The main Smart Links list shows one Payment navigation item first when active payment methods exist, followed by direct links in their saved order. `/s/[slug]/payments` lists only active methods in payment order. Each opens the existing QR image modal with name and Close/Back. Empty states are shown when no direct links or methods are available. Provider names never appear as separate main-page items.

`business_payment_qrs` stores id, business_id, administrator-defined name (1–80 characters), required image_path, sort_order, is_active and timestamps. No provider enum, provider dropdown, URL or API configuration exists. Admins add, rename, replace images, remove, enable/disable and reorder in the existing Smart Links management page. `apply_payment_qr_action` requires ADMIN, locks the business, validates image ownership and commits ordering and audit records atomically. Unique business/order constraints prevent duplicates.

Migration `20260909000003_dynamic_payments.sql` copies existing image-bearing payment rows into generic methods, preserving IDs, business relationship, image paths, enabled state, sort_order and timestamps. Legacy rows without images stay stored but hidden. Older migrations and historical events are unchanged. Existing private QR objects retain their paths; new uploads use `{business_id}/{payment_method_id}/{random_uuid}.png` in the private `business-payment-qrs` bucket. Names never form storage paths. PNG/JPEG/WebP uploads are capped at 2 MiB and fully decoded; malformed/MIME-mismatched images are rejected. Images are normalized to PNG without cropping or resizing, with a 16-million-pixel cap and 2 MiB output cap.

Admin and public image handlers resolve the stored method under the requested business, never a client image URL/path. Public page, QR-view action and image retrieval all enforce active business and active method state, independently of subscriptions. Images are served private/no-store. ADMIN RLS and durable rate limits remain. No payment APIs, external payment redirects, amounts, transactions, customer PII or payment confirmation are implemented.

Smart analytics remain separate from Review analytics: SMART_PAGE_VIEW is a main page open; SMART_LINK_CLICK is a supported direct-link tap; PAYMENT_PAGE_VIEW is a nested payment page open; PAYMENT_QR_VIEW is a QR viewer open. New payment events carry business_id and, for QR views, payment_method_id; no customer identity is recorded. Payment IDs remain in historical events after method deletion. Aggregate QR views include earlier history; per-method counts use current generic IDs. No event implies payment initiation or success.

Both QR destinations remain permanent and retain existing logo configuration, PNG/SVG rendering and filenames. Subscription changes affect Review access only. Run lint, typecheck, build, audit, test:smart-links, test:payment-qrs and test:qr-branding; browser/device checks cover layout and actual scans.

Migration `20260909000004_payment_storage_path_policy.sql` qualifies the Storage object path inside the business ownership check. Live rollback integration checks are available via `supabase db query --linked --file scripts/test-dynamic-payments.sql`; fixtures leave no persisted data.
