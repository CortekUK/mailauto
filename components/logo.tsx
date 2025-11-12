export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-cyan-500 to-cyan-600 shadow-lg ring-2 ring-blue-500/20">
        <span className="text-xl font-black text-white">M</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-cyan-500 to-cyan-600 shadow-lg ring-2 ring-blue-500/20">
        <span className="text-xl font-black text-white">M</span>
      </div>
      <div className="flex flex-col">
        <h1 className="text-xl font-black leading-none tracking-tight">
          <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-cyan-400 dark:to-cyan-300">
            Mail
          </span>
          <span className="text-foreground">Auto</span>
        </h1>
        <p className="text-xs font-medium text-muted-foreground leading-none mt-0.5">Email Automation</p>
      </div>
    </div>
  )
}
