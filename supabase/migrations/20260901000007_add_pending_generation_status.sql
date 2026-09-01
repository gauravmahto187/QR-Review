set lock_timeout = '10s';
set statement_timeout = '2min';

alter type public.review_generation_status add value if not exists 'PENDING';
