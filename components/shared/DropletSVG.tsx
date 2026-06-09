import { cn } from "@/lib/utils";

interface DropletSVGProps {
  className?: string;
  size?: number;
}

// Decorative oil-droplet / leaf flourish derived from the logo mark
export function DropletSVG({ className, size = 40 }: DropletSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-gold", className)}
      aria-hidden="true"
    >
      {/* Droplet shape */}
      <path
        d="M20 4C20 4 8 16 8 24C8 30.627 13.373 36 20 36C26.627 36 32 30.627 32 24C32 16 20 4 20 4Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M20 8C20 8 10 18.5 10 25C10 30.523 14.477 35 20 35C25.523 35 30 30.523 30 25C30 18.5 20 8 20 8Z"
        fill="currentColor"
        opacity="0.6"
      />
      {/* Leaf highlight */}
      <path
        d="M20 12C20 12 15 19 15 23C15 25.761 17.239 28 20 28"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
