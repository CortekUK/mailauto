import { AudiencesManager } from "@/components/audiences-manager"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Audiences",
}

export default function AudiencesPage() {
  return <AudiencesManager />
}
