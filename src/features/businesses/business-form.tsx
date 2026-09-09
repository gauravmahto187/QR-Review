"use client";

import { AlertCircle, ExternalLink, ImagePlus, LoaderCircle, Save } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { normalizeGoogleMapsUrl, slugifyBusinessName } from "@/features/businesses/schemas";
import type { BusinessFormState } from "@/features/businesses/actions";
import { validateLogoFile } from "@/features/businesses/logo-validation";
import type { Tables } from "@/types/database";

type Business = Tables<"businesses">;
type FormAction = (
  state: BusinessFormState,
  formData: FormData,
) => Promise<BusinessFormState>;

const initialState: BusinessFormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm text-rose-600">{errors[0]}</p>;
}

export function BusinessForm({
  action,
  business,
  mode,
}: {
  action: FormAction;
  business?: Business;
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name, setName] = useState(business?.name ?? "");
  const [slug, setSlug] = useState(business?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(business?.google_review_url ?? "");
  const [useBusinessLogoForQr, setUseBusinessLogoForQr] = useState(business?.use_business_logo_for_qr ?? false);
  const [qrLogoClientError, setQrLogoClientError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);
  const [logoClientError, setLogoClientError] = useState<string | null>(null);

  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  function handleNameChange(value: string) {
    setName(value);
    if (mode === "create" && !slugEdited) setSlug(slugifyBusinessName(value));
  }

  function handleLogoChange(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreviewFailed(false);
    const validationError = validateLogoFile(file ?? null);
    setLogoClientError(validationError);
    if (validationError) {
      input.value = "";
      setLogoPreview(null);
      return;
    }
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  const inputClass =
    "mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:bg-slate-100";
  const testGoogleMapsUrl = normalizeGoogleMapsUrl(googleReviewUrl);

  return (
    <form action={formAction} className="pb-28 sm:pb-4">
      {state.error ? (
        <div className="mb-5 flex gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>{state.error}</p>
        </div>
      ) : null}

      <div className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <label className="block text-sm font-semibold text-slate-800">
          Business name
          <input
            autoComplete="organization"
            className={inputClass}
            maxLength={160}
            name="name"
            onChange={(event) => handleNameChange(event.target.value)}
            required
            value={name}
          />
          <FieldError errors={state.fieldErrors?.name} />
        </label>

        <label className="block text-sm font-semibold text-slate-800">
          Permanent slug
          <input
            aria-describedby="slug-help"
            className={inputClass}
            disabled={mode === "edit"}
            maxLength={80}
            name="slug"
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value.toLowerCase());
            }}
            required
            value={slug}
          />
          {mode === "edit" ? <input name="slug" type="hidden" value={slug} /> : null}
          <p className="mt-2 text-xs leading-5 text-slate-500" id="slug-help">
            {mode === "create"
              ? "Used in the public review URL. You can edit it until creation."
              : "The public URL slug is permanent after creation."}
          </p>
          <FieldError errors={state.fieldErrors?.slug} />
        </label>

        <label className="block text-sm font-semibold text-slate-800">
          Description <span className="font-normal text-slate-400">(optional)</span>
          <textarea
            className={`${inputClass} min-h-28 py-3`}
            defaultValue={business?.description ?? ""}
            maxLength={1000}
            name="description"
          />
          <FieldError errors={state.fieldErrors?.description} />
        </label>

        <div>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="google-maps-url">
            Google Maps Link
          </label>
          <input
            className={inputClass}
            id="google-maps-url"
            inputMode="url"
            name="googleReviewUrl"
            onChange={(event) => setGoogleReviewUrl(event.target.value)}
            placeholder="https://www.google.com/maps/place/..."
            required
            type="url"
            value={googleReviewUrl}
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            {testGoogleMapsUrl ? <a className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800" href={testGoogleMapsUrl} rel="noreferrer" target="_blank">Test link<ExternalLink className="size-3.5" /></a> : null}
          </div>
          <FieldError errors={state.fieldErrors?.googleReviewUrl} />
        </div>

        <label className="block text-sm font-semibold text-slate-800">
          Primary color <span className="font-normal text-slate-400">(optional)</span>
          <input
            className={inputClass}
            defaultValue={business?.primary_color ?? ""}
            name="primaryColor"
            placeholder="#10B981"
          />
          <FieldError errors={state.fieldErrors?.primaryColor} />
        </label>

        {mode === "create" ? (
          <label className="block text-sm font-semibold text-slate-800">
            Status
            <select className={inputClass} defaultValue="ACTIVE" name="status">
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <FieldError errors={state.fieldErrors?.status} />
          </label>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-800">Status</p>
            <p className="mt-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {business?.status.charAt(0)}{business?.status.slice(1).toLowerCase()}
            </p>
            <input name="status" type="hidden" value={business?.status} />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="logo">
            Business Logo <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <label
            className="mt-2 flex min-h-28 cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-slate-300 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/40"
            htmlFor="logo"
          >
            {logoPreview && !logoPreviewFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="New logo preview" className="size-16 rounded-2xl object-cover" onError={() => setLogoPreviewFailed(true)} src={logoPreview} />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <ImagePlus className="size-6" aria-hidden="true" />
              </span>
            )}
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                {business?.logo_path ? "Replace Business Logo" : "Choose Business Logo"}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                PNG, JPEG, WebP, HEIC, or HEIF. Maximum 2 MiB.
              </span>
              {logoPreviewFailed ? <span className="mt-1 block text-xs text-amber-700">Preview is unavailable in this browser, but the selected HEIC/HEIF file can still be uploaded.</span> : null}
            </span>
          </label>
          <input
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
            className="sr-only"
            id="logo"
            name="logo"
            onChange={(event) => handleLogoChange(event.currentTarget)}
            type="file"
          />
          {logoClientError ? <p className="mt-2 text-sm text-rose-600" role="alert">{logoClientError}</p> : <FieldError errors={state.fieldErrors?.logo} />}
        </div>
        <div className="border-t border-slate-200 pt-5">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="qrLogo">QR Logo (optional)</label>
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-slate-800">
            <input type="checkbox" name="useBusinessLogoForQr" checked={useBusinessLogoForQr} onChange={(event) => setUseBusinessLogoForQr(event.target.checked)} />
            Use Business Logo for QR
          </label>
          <input id="qrLogo" name="qrLogo" type="file" disabled={useBusinessLogoForQr}
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
            className="mt-2 block w-full text-sm text-slate-600 disabled:opacity-50"
            onChange={(event) => {
              const error = validateLogoFile(event.currentTarget.files?.[0] ?? null);
              setQrLogoClientError(error);
              if (error) event.currentTarget.value = "";
            }} />
          <p className="mt-2 text-xs text-slate-500">PNG, JPEG, WebP, HEIC, or HEIF. Maximum 2 MiB.</p>
          {business?.qr_logo_path ? <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-slate-800"><input type="checkbox" name="removeQrLogo" />Remove saved QR Logo</label> : null}
          {qrLogoClientError ? <p className="mt-2 text-sm text-rose-600" role="alert">{qrLogoClientError}</p> : <FieldError errors={state.fieldErrors?.qrLogo} />}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0">
        <button
          className="mx-auto flex min-h-12 w-full max-w-3xl items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70 sm:mx-0 sm:w-auto"
          disabled={pending || business?.status === "ARCHIVED"}
          type="submit"
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Save className="size-5" aria-hidden="true" />}
          {pending ? "Saving…" : mode === "create" ? "Create business" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
