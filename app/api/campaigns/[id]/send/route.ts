import { NextRequest, NextResponse } from 'next/server';
import { sendCampaignEmails } from '@/lib/campaign-sender';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  const result = await sendCampaignEmails(campaignId);

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Campaign sent successfully',
      stats: result.stats
    });
  } else {
    return NextResponse.json({
      success: false,
      error: result.error
    }, { status: 400 });
  }
}
