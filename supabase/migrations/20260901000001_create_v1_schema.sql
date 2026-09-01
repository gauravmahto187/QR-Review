set lock_timeout = '10s';
set statement_timeout = '2min';

create extension if not exists pgcrypto with schema extensions;

create type public.admin_role as enum ('ADMIN');
create type public.business_status as enum ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
create type public.subscription_status as enum (
  'TRIAL',
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'CANCELLED'
);
create type public.generation_language as enum ('en', 'ne');
create type public.review_generation_status as enum ('SUCCEEDED', 'FAILED');
create type public.analytics_event_type as enum (
  'PAGE_VIEW',
  'REVIEW_STARTED',
  'REVIEW_GENERATED',
  'REVIEW_REGENERATED',
  'REVIEW_EDITED',
  'GOOGLE_REVIEW_CLICK'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete restrict,
  role public.admin_role not null default 'ADMIN',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 100)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_path text,
  primary_color text,
  google_review_url text not null,
  status public.business_status not null default 'ACTIVE',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_name_length check (char_length(name) between 1 and 160),
  constraint businesses_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint businesses_google_review_url_length
    check (char_length(google_review_url) between 1 and 2048),
  constraint businesses_primary_color_format
    check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint businesses_archived_at_consistency
    check (
      (status = 'ARCHIVED' and archived_at is not null)
      or (status <> 'ARCHIVED' and archived_at is null)
    )
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  plan text not null,
  status public.subscription_status not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  is_current boolean not null default true,
  suspended_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_length check (char_length(plan) between 1 and 80),
  constraint subscriptions_valid_period check (expires_at > starts_at),
  constraint subscriptions_suspended_at_consistency
    check (status <> 'SUSPENDED' or suspended_at is not null),
  constraint subscriptions_cancelled_at_consistency
    check (status <> 'CANCELLED' or cancelled_at is not null)
);

create table public.review_questions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  question text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_questions_question_length
    check (char_length(question) between 1 and 300),
  constraint review_questions_sort_order_nonnegative check (sort_order >= 0)
);

create table public.review_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.review_questions (id) on delete cascade,
  label text not null,
  value text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_question_options_label_length
    check (char_length(label) between 1 and 160),
  constraint review_question_options_value_length
    check (char_length(value) between 1 and 160),
  constraint review_question_options_sort_order_nonnegative check (sort_order >= 0),
  constraint review_question_options_question_value_unique unique (question_id, value)
);

create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  anonymous_session_id uuid not null unique default gen_random_uuid(),
  answers jsonb not null default '{}'::jsonb,
  generation_language public.generation_language not null default 'en',
  regeneration_count smallint not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_sessions_identity_unique unique (id, business_id),
  constraint review_sessions_answers_object check (jsonb_typeof(answers) = 'object'),
  constraint review_sessions_regeneration_limit
    check (regeneration_count between 0 and 1),
  constraint review_sessions_completed_at_valid
    check (completed_at is null or completed_at >= started_at),
  constraint review_sessions_expires_at_valid
    check (expires_at is null or expires_at > started_at)
);

create table public.review_generations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  business_id uuid not null,
  provider text not null,
  model text,
  prompt_version text not null default 'v1',
  input_hash text,
  generated_text text,
  generation_number smallint not null,
  language public.generation_language not null,
  status public.review_generation_status not null default 'SUCCEEDED',
  error_code text,
  created_at timestamptz not null default now(),
  constraint review_generations_session_business_fk
    foreign key (session_id, business_id)
    references public.review_sessions (id, business_id)
    on delete cascade,
  constraint review_generations_provider_length
    check (char_length(provider) between 1 and 80),
  constraint review_generations_prompt_version_length
    check (char_length(prompt_version) between 1 and 80),
  constraint review_generations_number_limit check (generation_number between 1 and 2),
  constraint review_generations_session_number_unique unique (session_id, generation_number),
  constraint review_generations_result_consistency
    check (
      (status = 'SUCCEEDED' and generated_text is not null and char_length(generated_text) > 0)
      or (status = 'FAILED' and error_code is not null)
    )
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  session_id uuid,
  event_type public.analytics_event_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_session_business_fk
    foreign key (session_id, business_id)
    references public.review_sessions (id, business_id)
    on delete set null (session_id),
  constraint analytics_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete restrict,
  business_id uuid references public.businesses (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_length check (char_length(action) between 1 and 120),
  constraint audit_logs_entity_type_length
    check (char_length(entity_type) between 1 and 120),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index subscriptions_one_current_per_business_idx
  on public.subscriptions (business_id)
  where is_current;

create index subscriptions_business_created_at_idx
  on public.subscriptions (business_id, created_at desc);
create index subscriptions_status_expires_at_idx
  on public.subscriptions (status, expires_at);
create index subscriptions_current_expires_at_idx
  on public.subscriptions (expires_at)
  where is_current;

create index review_questions_business_sort_idx
  on public.review_questions (business_id, sort_order);
create index review_question_options_question_sort_idx
  on public.review_question_options (question_id, sort_order);
create index review_sessions_business_created_at_idx
  on public.review_sessions (business_id, created_at desc);
create index review_sessions_expires_at_idx
  on public.review_sessions (expires_at)
  where expires_at is not null;
create index review_generations_business_created_at_idx
  on public.review_generations (business_id, created_at desc);
create index analytics_events_business_created_at_idx
  on public.analytics_events (business_id, created_at desc);
create index analytics_events_type_created_at_idx
  on public.analytics_events (event_type, created_at desc);
create index analytics_events_business_type_created_at_idx
  on public.analytics_events (business_id, event_type, created_at desc);
create index audit_logs_admin_created_at_idx
  on public.audit_logs (admin_user_id, created_at desc);
create index audit_logs_business_created_at_idx
  on public.audit_logs (business_id, created_at desc)
  where business_id is not null;

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger review_questions_set_updated_at
before update on public.review_questions
for each row execute function public.set_updated_at();

create trigger review_question_options_set_updated_at
before update on public.review_question_options
for each row execute function public.set_updated_at();

create trigger review_sessions_set_updated_at
before update on public.review_sessions
for each row execute function public.set_updated_at();
