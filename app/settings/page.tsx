import { SettingsManager } from "@/components/settings-manager"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  return <SettingsManager />
}
