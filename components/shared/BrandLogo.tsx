import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

interface BrandLogoProps {
  variant?: "full" | "compact";
  className?: string;
  href?: string;
}

export function BrandLogo({ variant = "full", className, href = "/" }: BrandLogoProps) {
  const content =
    variant === "compact" ? (
      <div className={cn("relative flex items-center", className)}>
        <Image
          src="/logo.jpeg"
          alt={brand.name}
          width={40}
          height={40}
          className="h-10 w-auto object-contain"
          priority
        />
      </div>
    ) : (
      <div className={cn("relative flex items-center gap-3", className)}>
        <Image
          src="/logo.jpeg"
          alt={brand.name}
          width={160}
          height={48}
          className="h-12 w-auto object-contain"
          priority
        />
      </div>
    );

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 rounded-sm" aria-label={`${brand.name} — Home`}>
        {content}
      </Link>
    );
  }
  return content;
}
