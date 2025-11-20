import { AudiencesManagerSimple } from "@/components/audiences-manager-simple"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Audiences",
}

export default function AudiencesPage() {
  return <AudiencesManagerSimple />
}
