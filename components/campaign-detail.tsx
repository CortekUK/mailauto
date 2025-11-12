"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getCampaign,
  getCampaignRecipients,
  getCampaignEvents,
  cancelCampaign,
  duplicateCampaign,
  resendToFailures,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  Copy,
  Mail,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MousePointerClick,
  AlertTriangle,
  Download,
  RotateCcw,
  Ban,
  Loader2,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Campaign {
  id: string
  subject: string
  status: string
  from_name: string
  from_email: string
  html: string
  text_fallback: string
  scheduled_at?: string
  audiences?: { id: string; name: string }
  stats?: {
    sent: number
    delivered: number
    opens: number
    unique_opens: number
    clicks: number
    unique_clicks: number
    failures: number
  }
}

interface Recipient {
  id: string
  email: string
  delivery_status: string
  opens_count: number
  clicks_count: number
  last_event_at?: string
  error?: string
  contacts?: { email: string; first_name?: string }
}

interface Event {
  id: string
  event_type: string
  created_at: string
  recipient_email: string
  metadata?: any
}

export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [recipientFilter, setRecipientFilter] = useState<string>("all")
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [campaignId])

  async function loadData() {
    try {
      setLoading(true)
      const [campaignData, recipientsData, eventsData] = await Promise.all([
        getCampaign(campaignId),
        getCampaignRecipients(campaignId),
        getCampaignEvents(campaignId),
      ])
      setCampaign(campaignData)
      setRecipients(recipientsData)
      setEvents(eventsData)
    } catch (error: any) {
      toast({
        title: "Error loading campaign",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    try {
      setActionLoading(true)
      await cancelCampaign(campaignId)
      toast({ title: "Campaign canceled successfully" })
      setShowCancelDialog(false)
      loadData()
    } catch (error: any) {
      toast({
        title: "Failed to cancel campaign",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDuplicate() {
    try {
      setActionLoading(true)
      const result = await duplicateCampaign(campaignId)
      toast({ title: "Campaign duplicated" })
      router.push(`/?draft=${result.id}`)
    } catch (error: any) {
      toast({
        title: "Failed to duplicate campaign",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleResendFailures() {
    try {
      setActionLoading(true)
      await resendToFailures(campaignId)
      toast({ title: "Resending to failed recipients" })
      loadData()
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  function exportRecipientsCSV() {
    const headers = ["Email", "First Name", "Status", "Opens", "Clicks", "Last Event"]
    const rows = filteredRecipients.map((r) => [
      r.contacts?.email || r.email,
      r.contacts?.first_name || "",
      r.delivery_status,
      r.opens_count,
      r.clicks_count,
      r.last_event_at ? new Date(r.last_event_at).toISOString() : "",
    ])
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `campaign-${campaignId}-recipients.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "CSV exported successfully" })
  }

  if (loading || !campaign) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const stats = campaign.stats || {
    sent: 0,
    delivered: 0,
    opens: 0,
    unique_opens: 0,
    clicks: 0,
    unique_clicks: 0,
    failures: 0,
  }

  const openRate = stats.delivered > 0 ? ((stats.unique_opens / stats.delivered) * 100).toFixed(1) : "0.0"
  const clickRate = stats.delivered > 0 ? ((stats.unique_clicks / stats.delivered) * 100).toFixed(1) : "0.0"

  const filteredRecipients =
    recipientFilter === "all"
      ? recipients
      : recipients.filter((r) => {
          if (recipientFilter === "delivered") return r.delivery_status === "delivered"
          if (recipientFilter === "opened") return r.opens_count > 0
          if (recipientFilter === "clicked") return r.clicks_count > 0
          if (recipientFilter === "bounced") return r.delivery_status === "bounced"
          if (recipientFilter === "failed") return r.delivery_status === "failed"
          return true
        })

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    queued: "bg-blue-100 text-blue-700",
    sending: "bg-amber-100 text-amber-700",
    sent: "bg-green-100 text-green-700",
    canceled: "bg-red-100 text-red-700",
  }

  // Simple opens over time data (last 7 days)
  const opensOverTime = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dayEvents = events.filter(
      (e) => e.event_type === "opened" && new Date(e.created_at).toDateString() === date.toDateString(),
    )
    return { day: i, count: dayEvents.length }
  })
  const maxOpens = Math.max(...opensOverTime.map((d) => d.count), 1)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-balance text-3xl font-semibold tracking-tight">{campaign.subject}</h1>
              <Badge className={statusColors[campaign.status] || statusColors.draft}>{campaign.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              To: {campaign.audiences?.name || "No audience"} • From: {campaign.from_name} ({campaign.from_email})
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={actionLoading}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            {campaign.status === "queued" && (
              <Button variant="outline" size="sm" onClick={() => setShowCancelDialog(true)} disabled={actionLoading}>
                <Ban className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            {campaign.status === "sent" && stats.failures > 0 && (
              <Button variant="outline" size="sm" onClick={handleResendFailures} disabled={actionLoading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resend to Failures
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sent</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.sent}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.delivered}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(1) : "0"}% delivery rate
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{openRate}%</div>
                  <p className="text-xs text-muted-foreground">{stats.unique_opens} unique opens</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clickRate}%</div>
                  <p className="text-xs text-muted-foreground">{stats.unique_clicks} unique clicks</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failures</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.failures}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.sent > 0 ? ((stats.failures / stats.sent) * 100).toFixed(1) : "0"}% failure rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Opens over time chart */}
            <Card>
              <CardHeader>
                <CardTitle>Opens Over Time (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-[200px] items-end justify-between gap-2">
                  {opensOverTime.map((d, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <div className="relative w-full">
                        <div
                          className="w-full rounded-t bg-primary transition-all hover:opacity-80"
                          style={{ height: `${(d.count / maxOpens) * 160}px` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">D{d.day + 1}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={recipientFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecipientFilter("all")}
                >
                  All ({recipients.length})
                </Button>
                <Button
                  variant={recipientFilter === "delivered" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecipientFilter("delivered")}
                >
                  Delivered
                </Button>
                <Button
                  variant={recipientFilter === "opened" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecipientFilter("opened")}
                >
                  Opened
                </Button>
                <Button
                  variant={recipientFilter === "clicked" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecipientFilter("clicked")}
                >
                  Clicked
                </Button>
                <Button
                  variant={recipientFilter === "bounced" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecipientFilter("bounced")}
                >
                  Bounced
                </Button>
                <Button
                  variant={recipientFilter === "failed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecipientFilter("failed")}
                >
                  Failed
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={exportRecipientsCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Delivery Status</TableHead>
                    <TableHead>Opens</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Last Event</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No recipients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecipients.map((recipient) => (
                      <TableRow key={recipient.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{recipient.contacts?.email || recipient.email}</div>
                            {recipient.contacts?.first_name && (
                              <div className="text-sm text-muted-foreground">{recipient.contacts.first_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              recipient.delivery_status === "delivered"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : recipient.delivery_status === "failed" || recipient.delivery_status === "bounced"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                            }
                          >
                            {recipient.delivery_status}
                          </Badge>
                          {recipient.error && <div className="mt-1 text-xs text-red-600">{recipient.error}</div>}
                        </TableCell>
                        <TableCell>{recipient.opens_count}</TableCell>
                        <TableCell>{recipient.clicks_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {recipient.last_event_at
                            ? formatDistanceToNow(new Date(recipient.last_event_at), { addSuffix: true })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>HTML Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="max-h-[600px] overflow-auto rounded border bg-white p-4"
                    dangerouslySetInnerHTML={{ __html: campaign.html }}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Plain Text Fallback</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-[600px] overflow-auto rounded border bg-muted p-4 text-sm">
                    {campaign.text_fallback}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Event Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <p className="text-center text-muted-foreground">No events yet</p>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          {event.event_type === "delivered" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {event.event_type === "opened" && <Mail className="h-4 w-4 text-blue-600" />}
                          {event.event_type === "clicked" && <MousePointerClick className="h-4 w-4 text-purple-600" />}
                          {event.event_type === "bounced" && <XCircle className="h-4 w-4 text-red-600" />}
                          {event.event_type === "failed" && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium capitalize">{event.event_type}</div>
                              <div className="text-sm text-muted-foreground">{event.recipient_email}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                            </div>
                          </div>
                          {event.metadata && (
                            <pre className="mt-2 rounded bg-muted p-2 text-xs">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the campaign from being sent. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Campaign</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
