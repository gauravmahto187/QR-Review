import Image from "next/image";

export function BrandLogo({ className = "h-10 w-auto", priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/nexgen-digital-logo.png" alt="NexGen Digital" width={900} height={266} priority={priority} className={`${className} object-contain`} />;
}
