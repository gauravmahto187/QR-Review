alter table public.businesses
  add column qr_logo_path text,
  add column use_business_logo_for_qr boolean not null default false;

comment on column public.businesses.qr_logo_path is 'Optional center image in business-logos storage; never public review branding.';
comment on column public.businesses.use_business_logo_for_qr is 'Explicitly prefer the current business logo for QR; otherwise use qr_logo_path or plain QR.';
