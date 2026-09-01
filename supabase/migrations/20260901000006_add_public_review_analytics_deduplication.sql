set lock_timeout = '10s';
set statement_timeout = '2min';

alter table public.analytics_events add column dedupe_key text;

create unique index analytics_events_dedupe_key_unique_idx
  on public.analytics_events (dedupe_key)
  where dedupe_key is not null;

create unique index analytics_review_started_session_unique_idx
  on public.analytics_events (session_id)
  where event_type = 'REVIEW_STARTED' and session_id is not null;

alter table public.analytics_events
  add constraint analytics_events_dedupe_key_length
  check (dedupe_key is null or char_length(dedupe_key) between 1 and 200);
