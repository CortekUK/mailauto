"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  isCollapsed?: boolean
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size={isCollapsed ? "icon" : "sm"} className={cn("w-full", isCollapsed && "px-0")}>
        <div className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = theme === "dark"

  return (
    <Button
      variant="ghost"
      size={isCollapsed ? "icon" : "sm"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn("w-full hover:bg-accent", isCollapsed && "justify-center px-0")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Light Mode</span>}
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Dark Mode</span>}
        </>
      )}
    </Button>
  )
}
