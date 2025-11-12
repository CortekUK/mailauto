"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Send, Users, Layers, Settings, Mail } from "lucide-react"

export function Nav() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "MailAuto", icon: Send },
    { href: "/campaigns", label: "Campaigns", icon: Mail },
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/audiences", label: "Audiences", icon: Layers },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center gap-8">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground pb-0.5",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {isActive && <span className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-primary" />}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
