# Architecture

## Stack

- Next.js App Router, TypeScript, and Tailwind CSS
- Supabase PostgreSQL, Auth, Storage, RLS, and versioned migrations
- Vercel as the later Next.js deployment target
- Provider-independent AI adapters

## Application boundaries

```text
Routes and UI
  → server actions / route handlers
  → application services
  → repositories
  → Supabase PostgreSQL
```

- `src/app` owns routes, layouts, and route handlers.
- `src/components/ui` contains reusable interface primitives.
- `src/features` groups product-specific code.
- `src/lib/supabase` owns browser, SSR, proxy, and privileged clients.
- `src/lib/auth` owns identity and admin-authorization helpers.
- `src/server/services` owns business workflows.
- `src/server/repositories` owns persistence access.
- `src/types/database.ts` mirrors the migration schema until types can be regenerated from an applied database.

Business logic must not live in presentation components. Client Components are limited to browser interactions.

## Supabase clients and keys

The browser and authenticated SSR clients use `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is expected to be visible and relies on RLS for data protection.

The privileged server client uses `SUPABASE_SECRET_KEY`, disables browser-style session persistence, imports `server-only`, and must be called only after application-level authorization. The secret key bypasses RLS and must never enter browser code, logs, URLs, or public documentation.

The root Next.js proxy refreshes Supabase Auth cookies via `getClaims()`. It becomes a no-op when Supabase public configuration is absent, preserving local foundation development.

## Authentication and authorization

Only admins authenticate. Supabase Auth establishes identity; an `admin_profiles` row with role `ADMIN` establishes application authorization. `getAdminAuthState()` distinguishes an anonymous request from an authenticated non-admin, `getCurrentAdmin()` resolves the profile, and `requireAdmin()` protects server-rendered admin features.

`/login` uses a server action to validate email/password input and call Supabase Auth. Successful authentication is followed immediately by an `admin_profiles` authorization query. Non-admin sessions are signed out and denied. Existing authorized sessions redirect directly to `/admin`.

The `/admin` layout performs identity and profile checks on the server for every nested admin route. Anonymous requests redirect to `/login`; authenticated users without an admin profile redirect to an unauthorized state on the login page. Logout invalidates the Supabase session, refreshes the route tree, and returns to `/login`.

The initial profile is provisioned by an idempotent version-controlled Node script. It uses the server-only secret key, verifies that the supplied Auth user exists, and upserts only the matching `ADMIN` profile. It contains no password or API key.

## Admin interface

The admin shell is designed for 360–430px first. Mobile uses a fixed, safe-area-aware bottom navigation with Home, Businesses, Reviews, and More. Tablet and desktop progressively switch to a left sidebar while retaining the same information architecture. Businesses provides mobile-first management; Reviews remains a protected placeholder.

## Business management

`/admin/businesses` renders a server-loaded, RLS-protected card list with name search and status filtering. Create, edit, detail, and lifecycle routes live under the same protected admin layout. Client Components are limited to form interaction, image preview, and confirmation dialogs; all reads use the authenticated SSR client and every mutation calls `requireAdmin()` before using that client.

Business slugs are normalized and validated before creation, including reserved names and uniqueness. Edit operations load the stored slug and never accept a replacement from the browser. Business lifecycle transitions are restricted to active → suspended/archived and suspended → active/archived. Archived is terminal in the admin application, and no hard-delete action exists.

Business mutations write corresponding audit events for creation, profile updates, Google URL changes, logo changes, suspension, reactivation, and archive.

## RLS strategy

RLS is enabled on every application table. `anon` receives no application-table privileges or policies. Authenticated users can access rows only when the security-definer `is_admin()` function confirms a matching admin profile. Public review operations will later use narrow server-side handlers rather than broad anonymous table policies.

The secret-key client bypasses RLS, so application authorization remains mandatory before privileged operations. RLS is defense in depth, not a replacement for server authorization.

## Storage strategy

`supabase/config.toml` defines the public `business-logos` bucket with a 2 MiB limit and PNG, JPEG, WebP, HEIC, and HEIF MIME allowlist. The versioned bucket configuration script applies matching settings to the hosted project. Storage object policies permit authenticated admins to manage only that bucket. Anonymous writes and listings are not allowed; public object URLs provide simple logo delivery.

Supabase Storage internals are not mutated directly in SQL. The bucket must be seeded locally or created with matching settings in the hosted project.

## Public flow

The later customer route is `/r/[slug]`. Server logic will resolve the business, verify status and the one current subscription, then return either the review experience or an unavailable state. Public operations will not trust client-submitted business identifiers.

## AI and analytics boundaries

Feature code will call `generateReview()` through mock, Gemini, or OpenAI adapters. Keys remain server-only. One initial generation and one regeneration are enforced server-side and in database constraints.

Analytics is append-oriented and limited to approved event types. A Google click never represents a confirmed review submission.

## Time and performance

PostgreSQL stores `timestamptz` values in UTC. Subscription dates will later display in `Asia/Kathmandu`. Public QR routes have the highest performance priority, and caching must not leave subscription status stale.
