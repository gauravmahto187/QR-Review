export type QrBranding = {
  logo_path: string | null;
  qr_logo_path: string | null;
  use_business_logo_for_qr: boolean;
};

export function resolveQrLogoPath(business: QrBranding) {
  return business.use_business_logo_for_qr && business.logo_path
    ? business.logo_path
    : business.qr_logo_path;
}

export function qrBrandingLabel(business: QrBranding) {
  if (business.use_business_logo_for_qr && business.logo_path) return "Using Business Logo";
  return business.qr_logo_path ? "Custom" : "None";
}
