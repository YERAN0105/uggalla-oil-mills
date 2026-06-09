import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-gradient-to-r from-sand via-sage/40 to-sand bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
