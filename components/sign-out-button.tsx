"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface SignOutButtonProps {
  isCollapsed?: boolean
}

export function SignOutButton({ isCollapsed = false }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={loading}
      className={cn("w-full hover:bg-accent", isCollapsed && "justify-center px-0")}
    >
      <LogOut className="h-4 w-4" />
      {!isCollapsed && <span className="ml-2">{loading ? "Signing out..." : "Sign Out"}</span>}
    </Button>
  )
}
