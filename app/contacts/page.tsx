import { ContactsManager } from "@/components/contacts-manager"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacts",
}

export default function ContactsPage() {
  return <ContactsManager />
}
