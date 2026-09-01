set lock_timeout = '10s';
set statement_timeout = '2min';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles
    where auth_user_id = (select auth.uid())
      and role = 'ADMIN'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

alter table public.admin_profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.review_questions enable row level security;
alter table public.review_question_options enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_generations enable row level security;
alter table public.analytics_events enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.admin_profiles from anon;
revoke all on table public.businesses from anon;
revoke all on table public.subscriptions from anon;
revoke all on table public.review_questions from anon;
revoke all on table public.review_question_options from anon;
revoke all on table public.review_sessions from anon;
revoke all on table public.review_generations from anon;
revoke all on table public.analytics_events from anon;
revoke all on table public.audit_logs from anon;

grant select, insert, update, delete on table public.admin_profiles to authenticated;
grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.review_questions to authenticated;
grant select, insert, update, delete on table public.review_question_options to authenticated;
grant select, insert, update, delete on table public.review_sessions to authenticated;
grant select, insert, update, delete on table public.review_generations to authenticated;
grant select, insert, update, delete on table public.analytics_events to authenticated;
grant select, insert, update, delete on table public.audit_logs to authenticated;

grant all on table public.admin_profiles to service_role;
grant all on table public.businesses to service_role;
grant all on table public.subscriptions to service_role;
grant all on table public.review_questions to service_role;
grant all on table public.review_question_options to service_role;
grant all on table public.review_sessions to service_role;
grant all on table public.review_generations to service_role;
grant all on table public.analytics_events to service_role;
grant all on table public.audit_logs to service_role;

alter default privileges in schema public revoke all on tables from anon;

create policy "Admins can manage admin profiles"
on public.admin_profiles
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage businesses"
on public.businesses
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage subscriptions"
on public.subscriptions
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage review questions"
on public.review_questions
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage review question options"
on public.review_question_options
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage review sessions"
on public.review_sessions
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage review generations"
on public.review_generations
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage analytics events"
on public.analytics_events
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can manage audit logs"
on public.audit_logs
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
