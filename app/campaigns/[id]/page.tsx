import { CampaignDetail } from "@/components/campaign-detail"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Campaign Details",
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CampaignDetail campaignId={id} />
}
