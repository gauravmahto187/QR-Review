import QRCode from "qrcode";
import sharp from "sharp";
import { QR_PNG_WIDTH, QR_RENDER_OPTIONS, QR_SVG_WIDTH } from "./options";

// 14% image with 1% white padding per side; 16% total occlusion.
export async function prepareQrLogo(bytes: Buffer) {
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: false });
    const metadata = await image.metadata();
    if (!["png", "jpeg", "webp", "heif"].includes(metadata.format ?? "")) return null;
    return await image.rotate().resize(224, 224, { fit: "contain", background: "white" })
      .flatten({ background: "white" }).extend({ top: 16, bottom: 16, left: 16, right: 16, background: "white" }).png().toBuffer();
  } catch { return null; }
}

export async function renderQrPng(value: string, logo: Buffer | null = null) {
  const plain = await QRCode.toBuffer(value, { ...QR_RENDER_OPTIONS, type: "png", width: QR_PNG_WIDTH });
  if (!logo) return plain;
  try { return await sharp(plain).composite([{ input: logo, gravity: "centre" }]).png().toBuffer(); }
  catch { return plain; }
}

export async function renderQrSvg(value: string, logo: Buffer | null = null) {
  const plain = await QRCode.toString(value, { ...QR_RENDER_OPTIONS, type: "svg", width: QR_SVG_WIDTH });
  if (!logo) return plain;
  // qrcode's viewBox is expressed in modules, not output pixels.
  const size = QRCode.create(value, QR_RENDER_OPTIONS).modules.size + QR_RENDER_OPTIONS.margin * 2;
  const width = size * 0.16;
  const offset = (size - width) / 2;
  return plain.replace("</svg>", `<image x="${offset}" y="${offset}" width="${width}" height="${width}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${logo.toString("base64")}" /></svg>`);
}
