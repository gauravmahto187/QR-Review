import { NextResponse } from "next/server";
import { z } from "zod";

import { getBusinessById } from "@/features/businesses/queries";
import { getAdminAuthState } from "@/lib/auth/admin";
import { serverEnv } from "@/lib/env/server";
import { smartQrFilename } from "@/lib/urls/business-smart";
import { buildBusinessSmartUrl } from "@/lib/urls/business-smart";
import { generateQrPng, generateQrSvg, loadQrLogo } from "@/server/services/qr-code";

const idSchema = z.uuid();
const formatSchema = z.enum(["png", "svg"]);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin } = await getAdminAuthState();
  if (!admin) return NextResponse.json({ error: "Administrator authorization required." }, { status: 401 });
  const { id } = await params;
  const format = formatSchema.safeParse(new URL(request.url).searchParams.get("format") ?? "png");
  if (!idSchema.safeParse(id).success || !format.success) return NextResponse.json({ error: "Invalid QR request." }, { status: 400 });

  try {
    const { business, supabase } = await getBusinessById(id);
    if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    const publicUrl = buildBusinessSmartUrl(business.slug, serverEnv.NEXT_PUBLIC_APP_URL);
    const logo = await loadQrLogo(supabase, business);
    const filename = smartQrFilename(business.slug, format.data);
    const headers = { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${filename}"`, "X-Content-Type-Options": "nosniff" };
    if (format.data === "svg") return new NextResponse(await generateQrSvg(publicUrl, logo), { headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8" } });
    const png = await generateQrPng(publicUrl, logo);
    return new NextResponse(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  } catch {
    return NextResponse.json({ error: "Unable to generate this QR code." }, { status: 500 });
  }
}

