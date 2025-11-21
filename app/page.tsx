//app/page.tsx
import { LaunchConsole } from "@/components/launch-console"
import type { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "MailAuto",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LaunchConsole />
    </Suspense>
  )
}
