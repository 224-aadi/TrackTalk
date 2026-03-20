import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
        destructive: "bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700",
        outline:
          "border border-n-200 bg-white text-n-800 hover:bg-n-50 hover:border-n-300 active:bg-n-100",
        secondary: "bg-n-100 text-n-800 hover:bg-n-200 active:bg-n-200",
        ghost: "text-n-600 hover:bg-n-100 hover:text-n-900",
        link: "text-brand-600 underline-offset-4 hover:underline",
        accent: "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
