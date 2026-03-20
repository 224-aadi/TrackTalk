import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-600 text-white",
        secondary: "border-transparent bg-n-100 text-n-700",
        success: "border-transparent bg-success-50 text-success-700",
        destructive: "border-transparent bg-danger-50 text-danger-600",
        warning: "border-transparent bg-warning-50 text-warning-600",
        outline: "border-n-200 text-n-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
