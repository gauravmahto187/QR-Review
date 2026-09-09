"use client";
import { QrCode } from "lucide-react";
import { useState } from "react";

type ProviderLogo = { src: string; label: string };

const providerLogos: Array<ProviderLogo & { aliases: string[] }> = [
  { src: "/brands/esewa.svg", label: "eSewa", aliases: ["esewa", "e sewa"] },
  { src: "/brands/khalti.svg", label: "Khalti", aliases: ["khalti"] },
  { src: "/brands/fonepay.svg", label: "Fonepay", aliases: ["fonepay", "fone pay"] },
];

export function normalizeProviderName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolvePaymentProviderLogo(name: string): ProviderLogo | null {
  const normalized = normalizeProviderName(name);
  return providerLogos.find((provider) => provider.aliases.includes(normalized)) ?? null;
}

export function PaymentProviderLogo({ name, className = "size-9" }: { name: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const provider = resolvePaymentProviderLogo(name);
  if (!provider || failedSrc === provider.src) return <span className={`flex shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ${className}`}><QrCode aria-hidden="true" className="size-5" /></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={provider.src} alt="" aria-hidden="true" onError={() => setFailedSrc(provider.src)} className={`${className} shrink-0 object-contain`} />;
}
