import "server-only";

import QRCode from "qrcode";

import { QR_PNG_WIDTH, QR_RENDER_OPTIONS, QR_SVG_WIDTH } from "@/lib/qr/options";

export async function generateQrPng(value: string) {
  return QRCode.toBuffer(value, { ...QR_RENDER_OPTIONS, type: "png", width: QR_PNG_WIDTH });
}

export async function generateQrSvg(value: string) {
  return QRCode.toString(value, { ...QR_RENDER_OPTIONS, type: "svg", width: QR_SVG_WIDTH });
}

export function qrSvgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
