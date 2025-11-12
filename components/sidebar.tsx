"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Send, Mail, Users, Layers, Settings, Menu, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { SignOutButton } from "@/components/sign-out-button"

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const links = [
    { href: "/", label: "MailAuto", icon: Send, description: "Create campaigns" },
    { href: "/campaigns", label: "Campaigns", icon: Mail, description: "View all campaigns" },
    { href: "/contacts", label: "Contacts", icon: Users, description: "Manage subscribers" },
    { href: "/audiences", label: "Audiences", icon: Layers, description: "Saved segments" },
    { href: "/settings", label: "Settings", icon: Settings, description: "Configuration" },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 w-10 bg-background shadow-lg"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "lg:w-20" : "lg:w-64",
          isOpen && "w-64",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center border-b px-4">
            <Logo collapsed={isCollapsed} />
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 p-4">
            {links.map(({ href, label, icon: Icon, description }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent",
                    isActive
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground",
                    isCollapsed ? "justify-center" : "gap-3",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex-1">
                        <div className="leading-none">{label}</div>
                        <div
                          className={cn(
                            "text-xs leading-none mt-1",
                            isActive ? "text-primary/70" : "text-muted-foreground",
                          )}
                        >
                          {description}
                        </div>
                      </div>
                      {isActive && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            {!isCollapsed && (
              <div className="rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 p-3 text-xs">
                <div className="font-medium text-foreground">Production Ready</div>
                <div className="mt-1 text-muted-foreground">v1.0.0</div>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="border-t p-2">
            <SignOutButton isCollapsed={isCollapsed} />
          </div>

          {/* Theme Toggle Button */}
          <div className="hidden lg:block border-t p-2">
            <ThemeToggle isCollapsed={isCollapsed} />
          </div>

          {/* Collapse Button */}
          <div className="hidden lg:block border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn("w-full hover:bg-accent", isCollapsed && "justify-center px-0")}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Collapse
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
