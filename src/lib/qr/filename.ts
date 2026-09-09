export function qrDownloadFilename(slug: string, format: "png" | "svg") {
  return `nexgen-${slug}-qr.${format}`;
}
