set lock_timeout = '10s';
set statement_timeout = '2min';

alter table public.review_generations
  add column final_text text,
  add column finalized_at timestamptz,
  add constraint review_generations_final_text_consistency check (
    (final_text is null and finalized_at is null)
    or (
      final_text is not null
      and char_length(btrim(final_text)) between 1 and 1200
      and finalized_at is not null
      and status = 'SUCCEEDED'
    )
  );
