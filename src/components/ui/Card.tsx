import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border-subtle bg-surface p-6 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
