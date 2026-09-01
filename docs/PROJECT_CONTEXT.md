# Smart Review QR — Project Context

## Product

Smart Review QR is a subscription-based Google Review automation SaaS. One central admin manages multiple businesses. Each business receives a permanent URL at `/r/[slug]`, which is encoded in both printed QR codes and physical NFC tags.

A customer opens the permanent URL without an account, answers up to five multiple-choice questions, selects English or Nepali for the generated review, and receives a concise AI-assisted review based only on those answers. The customer may edit it and regenerate once. Continuing copies the review to the clipboard and opens the business's Google Review URL.

The application never injects text into Google, auto-pastes, automates a browser, or claims that a Google review was submitted. `GOOGLE_REVIEW_CLICK` means only that the customer was sent to Google.

## Users

- **Admin:** one central V1 admin managing all businesses, subscriptions, questions, QR URLs, logos, and analytics. The data model may support more admins later, but V1 has no multi-admin interface.
- **Customer:** anonymous, has no account, and enters through QR or NFC.

There are no business-admin or customer accounts in V1.

## Product requirements

- Mobile-first at 360–430px for both admin and customer experiences.
- Permanent business slugs that do not change with display names.
- Server-enforced business and subscription availability.
- Provider-independent AI generation with `MockProvider` first.
- Anonymous analytics without unnecessary customer personal information.
- Fast public QR pages with minimal client JavaScript.
- Production-oriented security, validation, auditability, and error handling.

## V1 exclusions

No payment gateway, recurring billing, business-specific admin accounts, customer accounts, social links, marketing automation, advanced CRM, direct Google review posting, or unsupported Google manipulation is in scope.

## Delivery phases

Phase 1 establishes the local Next.js foundation only. Supabase, authentication, database migrations, business features, subscriptions, review flow, AI providers, analytics, QR generation, and deployment require separate approval in later phases.
