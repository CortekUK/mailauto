"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith("/auth")

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <main className="lg:pl-64 transition-[padding] duration-300 has-[~aside.lg\\:w-20]:lg:pl-20">{children}</main>
    </>
  )
}
