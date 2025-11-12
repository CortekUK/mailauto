import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description: string
  action?: ReactNode
  variant?: "gradient" | "accent" | "default"
}

export function PageHeader({ title, description, action, variant = "default" }: PageHeaderProps) {
  const variants = {
    gradient:
      "bg-gradient-to-br from-blue-50 via-cyan-50/50 to-blue-50 dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-muted",
    accent:
      "bg-gradient-to-br from-orange-50 via-orange-50/50 to-orange-100/50 dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-muted",
    default:
      "bg-gradient-to-br from-muted/50 via-muted/30 to-background dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-muted",
  }

  return (
    <div className={`-mx-4 sm:-mx-6 lg:-mx-8 mb-8 px-4 sm:px-6 lg:px-8 py-8 lg:py-10 border-b ${variants[variant]}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between max-w-7xl mx-auto">
        <div className="flex-1">
          <h1 className="text-balance text-3xl font-bold tracking-tight lg:text-4xl">{title}</h1>
          <p className="mt-2 text-pretty text-base text-muted-foreground lg:text-lg max-w-3xl">{description}</p>
        </div>
        {action && <div className="flex-shrink-0 sm:mt-0">{action}</div>}
      </div>
    </div>
  )
}
