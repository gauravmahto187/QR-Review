export function qrDownloadFilename(slug: string, format: "png" | "svg") {
  return `boostup-${slug}-qr.${format}`;
}
