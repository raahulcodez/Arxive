import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#00E5FF] text-[#121212] shadow-xs hover:bg-[#00E5FF]/90",
        destructive:
          "bg-[#FF5252] text-white shadow-xs hover:bg-[#FF5252]/90 focus-visible:ring-[#FF5252]/20 dark:focus-visible:ring-[#FF5252]/40 dark:bg-[#FF5252]/60",
        outline:
          "border border-[#2A2A4E] bg-transparent shadow-xs hover:bg-[#00E5FF]/10 hover:text-[#00E5FF] dark:bg-[#1A1A2E]/30 dark:border-[#2A2A4E] dark:hover:bg-[#1A1A2E]/50",
        secondary:
          "bg-[#00BFA5] text-[#121212] shadow-xs hover:bg-[#00BFA5]/80",
        ghost:
          "hover:bg-[#00E5FF]/10 hover:text-[#00E5FF] dark:hover:bg-[#00E5FF]/10",
        link: 
          "text-[#00E5FF] underline-offset-4 hover:underline",
        accent:
          "bg-[#9D5CFF] text-[#121212] shadow-xs hover:bg-[#9D5CFF]/80",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    (<Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />)
  );
}

export { Button, buttonVariants }
