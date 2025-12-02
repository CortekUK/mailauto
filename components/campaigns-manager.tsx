"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/page-header"
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Users,
  TrendingUp,
  Search,
  Plus,
  Eye,
  MoreVertical,
  Copy,
  Filter,
  Edit,
  Trash2,
  Ban,
} from "lucide-react"
import { listCampaigns, duplicateCampaign, deleteCampaign, cancelCampaign } from "@/lib/api"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Campaign = {
  id: string
  subject: string
  from_email: string
  status: "draft" | "queued" | "sending" | "sent" | "failed" | "canceled"
  audience_id: string
  scheduled_at?: string
  sent_count?: number
  created_at: string
}

export function CampaignsManager() {
  const router = useRouter()
  const { toast } = useToast()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | Campaign["status"]>("all")

  useEffect(() => {
    loadCampaigns()
  }, [])

  useEffect(() => {
    let filtered = campaigns

    // Apply search filter - robust search with null safety
    const trimmedQuery = searchQuery.trim().toLowerCase()
    if (trimmedQuery) {
      filtered = filtered.filter((c) => {
        const subject = (c.subject || '').toLowerCase()
        const fromEmail = (c.from_email || '').toLowerCase()
        const status = (c.status || '').toLowerCase()

        return (
          subject.includes(trimmedQuery) ||
          fromEmail.includes(trimmedQuery) ||
          status.includes(trimmedQuery)
        )
      })
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }

    setFilteredCampaigns(filtered)
  }, [searchQuery, statusFilter, campaigns])

  async function loadCampaigns() {
    setIsLoading(true)
    try {
      const data = await listCampaigns()
      setCampaigns(data)
      setFilteredCampaigns(data)
    } catch (error: any) {
      toast({
        title: "Error loading campaigns",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDuplicate(campaignId: string, subject: string) {
    try {
      const duplicated = await duplicateCampaign(campaignId)
      toast({
        title: "Campaign duplicated",
        description: `"${subject}" has been duplicated as a draft.`,
      })
      loadCampaigns()
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Error duplicating campaign",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleDelete(campaignId: string, subject: string) {
    if (!confirm(`Are you sure you want to delete "${subject}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteCampaign(campaignId)
      toast({
        title: "Campaign deleted",
        description: `"${subject}" has been deleted successfully.`,
      })
      loadCampaigns()
    } catch (error: any) {
      toast({
        title: "Error deleting campaign",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleCancel(campaignId: string, subject: string) {
    if (!confirm(`Are you sure you want to cancel "${subject}"? This will stop the campaign from being sent.`)) {
      return
    }

    try {
      await cancelCampaign(campaignId)
      toast({
        title: "Campaign cancelled",
        description: `"${subject}" has been cancelled successfully.`,
      })
      loadCampaigns()
    } catch (error: any) {
      toast({
        title: "Error cancelling campaign",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  function handleEdit(campaignId: string) {
    router.push(`/?campaign=${campaignId}`)
  }

  function getStatusBadge(status: Campaign["status"]) {
    const variants: Record<
      Campaign["status"],
      { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; className: string }
    > = {
      draft: {
        label: "Draft",
        variant: "secondary",
        icon: Clock,
        className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
      },
      queued: {
        label: "Queued",
        variant: "default",
        icon: Calendar,
        className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
      },
      sending: {
        label: "Sending",
        variant: "default",
        icon: Loader2,
        className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
      },
      sent: {
        label: "Sent",
        variant: "outline",
        icon: CheckCircle2,
        className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
      },
      failed: {
        label: "Failed",
        variant: "destructive",
        icon: XCircle,
        className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
      },
      canceled: {
        label: "Cancelled",
        variant: "secondary",
        icon: Ban,
        className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
      },
    }

    const config = variants[status] || {
      label: status || "Unknown",
      variant: "secondary" as const,
      icon: Clock,
      className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
    }
    const Icon = config.icon

    return (
      <Badge className={`gap-1.5 font-medium ${config.className}`}>
        <Icon className={`h-3.5 w-3.5 ${status === "sending" ? "animate-spin" : ""}`} />
        {config.label}
      </Badge>
    )
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }
  }

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter((c) => c.status === "sent").length,
    queued: campaigns.filter((c) => c.status === "queued").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
  }

  const statsConfig = [
    {
      title: "Total Campaigns",
      value: stats.total,
      icon: Mail,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-800",
    },
    {
      title: "Sent",
      value: stats.sent,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: "Queued",
      value: stats.queued,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Drafts",
      value: stats.draft,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl">
        <PageHeader
          title="Campaigns"
          description="Manage all your email campaigns in one place"
          icon={<Mail className="h-4 w-4" />}
          variant="gradient"
          action={
            <Button
              size="lg"
              className="gap-2 shadow-lg bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-orange-600/20 dark:from-orange-500 dark:to-orange-600 dark:hover:from-orange-600 dark:hover:to-orange-700"
              onClick={() => router.push("/")}
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statsConfig.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="border-border/40 transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="mb-6 border-border/40">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns by subject, email, or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-10 border-border/40"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 border-border/40 bg-transparent">
                    <Filter className="h-4 w-4" />
                    {statusFilter === "all"
                      ? "All Status"
                      : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("sent")}>Sent</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("queued")}>Queued</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Draft</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("failed")}>Failed</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("canceled")}>Cancelled</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-xl">All Campaigns</CardTitle>
            <CardDescription className="text-base">
              {filteredCampaigns.length} {filteredCampaigns.length === 1 ? "campaign" : "campaigns"}
              {statusFilter !== "all" && ` · Filtered by ${statusFilter}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border border-border/40 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  {searchQuery || statusFilter !== "all" ? "No campaigns found" : "No campaigns yet"}
                </h3>
                <p className="text-balance text-sm text-muted-foreground max-w-sm mb-6">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Create your first campaign to start sending emails to your audience."}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button
                    onClick={() => router.push("/")}
                    size="lg"
                    className="gap-2 shadow-lg bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-orange-600/20 dark:from-orange-500 dark:to-orange-600 dark:hover:from-orange-600 dark:hover:to-orange-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create Campaign
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="group flex items-center gap-4 rounded-lg border border-border/40 p-4 transition-all hover:border-primary/50 hover:bg-accent/50 hover:shadow-md cursor-pointer"
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 transition-all group-hover:ring-2 group-hover:ring-primary/30">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-balance group-hover:text-primary transition-colors truncate">
                          {campaign.subject}
                        </h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="truncate font-medium">{campaign.from_email}</span>
                        {campaign.sent_count !== undefined && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              {campaign.sent_count} {campaign.sent_count === 1 ? "recipient" : "recipients"}
                            </span>
                          </>
                        )}
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(campaign.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/campaigns/${campaign.id}`)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/campaigns/${campaign.id}`)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {(campaign.status === "draft" || campaign.status === "queued") && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(campaign.id)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicate(campaign.id, campaign.subject)
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          {(campaign.status === "draft" || campaign.status === "queued") && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancel(campaign.id, campaign.subject)
                              }}
                              className="text-orange-600 focus:text-orange-600"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Cancel Campaign
                            </DropdownMenuItem>
                          )}
                          {(campaign.status === "draft" || campaign.status === "queued" || campaign.status === "failed") && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(campaign.id, campaign.subject)
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
