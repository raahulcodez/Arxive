import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[#00E5FF] text-[#121212] shadow hover:bg-[#00E5FF]/80",
        secondary:
          "bg-[#00BFA5] text-[#121212] hover:bg-[#00BFA5]/80",
        destructive:
          "bg-[#FF5252] text-white shadow hover:bg-[#FF5252]/80",
        outline:
          "border-[#2A2A4E] text-white",
        success:
          "bg-[#39D98A] text-[#121212] shadow hover:bg-[#39D98A]/80",
        warning:
          "bg-[#FFC107] text-[#121212] shadow hover:bg-[#FFC107]/80",
        accent:
          "bg-[#9D5CFF] text-[#121212] shadow hover:bg-[#9D5CFF]/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants } 