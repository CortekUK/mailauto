"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Confirm } from "@/components/ui/confirm"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, CheckCircle2, XCircle, Loader2, Mail, Save, Rocket, AlertCircle, Send } from "lucide-react"
import { createOrUpdateCampaign, queueCampaign, listAudiences, listSenderEmails, sendTestEmail } from "@/lib/api"
import { validateCampaign } from "@/lib/validation"
import { Logo } from "@/components/logo"

type Campaign = {
  id: string
  subject: string
  from_email: string
  status: "draft" | "queued" | "sending" | "sent" | "failed"
  audience_id: string
  scheduled_at?: string
  sent_count?: number
  created_at: string
}

type Audience = {
  id: string
  name: string
  description?: string
  preview_count?: number
}

type SenderEmail = {
  id: string
  display_name: string
  address: string
  verified: boolean
}

export function LaunchConsole() {
  const { toast } = useToast()

  const [fromName, setFromName] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [preheader, setPreheader] = useState("")
  const [audienceType, setAudienceType] = useState<"waitlist" | "full" | "saved">("full")
  const [audienceId, setAudienceId] = useState("")
  const [htmlContent, setHtmlContent] = useState("")
  const [textFallback, setTextFallback] = useState("")
  const [scheduleType, setScheduleType] = useState<"now" | "schedule">("now")
  const [scheduledAt, setScheduledAt] = useState("")
  const [testEmail, setTestEmail] = useState("")

  const [audiences, setAudiences] = useState<Audience[]>([])
  const [senderEmails, setSenderEmails] = useState<SenderEmail[]>([])
  const [draftId, setDraftId] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isQueueing, setIsQueueing] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isLoadingAudiences, setIsLoadingAudiences] = useState(false)
  const [isLoadingSenders, setIsLoadingSenders] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadAudiences()
    loadSenderEmails()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (subject && fromEmail && (audienceType !== "saved" || audienceId)) {
        handleSaveDraft(true)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [
    subject,
    fromEmail,
    audienceType,
    audienceId,
    fromName,
    htmlContent,
    textFallback,
    preheader,
    scheduleType,
    scheduledAt,
    draftId,
  ])

  async function loadAudiences() {
    setIsLoadingAudiences(true)
    try {
      const data = await listAudiences()
      setAudiences(data)
    } catch (error) {
      console.error("Failed to load audiences:", error)
    } finally {
      setIsLoadingAudiences(false)
    }
  }

  async function loadSenderEmails() {
    setIsLoadingSenders(true)
    try {
      const data = await listSenderEmails()
      setSenderEmails(data)
    } catch (error) {
      console.error("Failed to load sender emails:", error)
    } finally {
      setIsLoadingSenders(false)
    }
  }

  async function handleSaveDraft(silent = false) {
    if (!subject || !fromEmail) {
      if (!silent) {
        toast({
          title: "Missing fields",
          description: "Please fill in subject and from email",
          variant: "destructive",
        })
      }
      return
    }

    if (audienceType === "saved" && !audienceId) {
      if (!silent) {
        toast({
          title: "Missing audience",
          description: "Please select a saved audience",
          variant: "destructive",
        })
      }
      return
    }

    setIsSavingDraft(true)
    try {
      const payload = {
        id: draftId || undefined,
        subject,
        from_name: fromName,
        from_email: fromEmail,
        preheader: preheader || undefined,
        audience_id: audienceType === "saved" ? audienceId : undefined,
        html: htmlContent,
        text_fallback: textFallback || undefined,
        scheduled_at: scheduleType === "schedule" && scheduledAt ? scheduledAt : undefined,
        status: "draft",
      }

      const result = await createOrUpdateCampaign(payload)
      setDraftId(result.id)
      setLastSaved(new Date())
      setValidationErrors({})

      if (!silent) {
        toast({
          title: "Draft saved successfully",
        })
      }
    } catch (error: any) {
      if (!silent) {
        toast({
          title: "Error saving draft",
          description: error.message,
          variant: "destructive",
        })
      }
    } finally {
      setIsSavingDraft(false)
    }
  }

  function handleScheduleClick() {
    const validation = validateCampaign({
      subject,
      fromEmail,
      audienceType,
      audienceId,
      htmlContent,
      scheduleType,
      scheduledAt,
      senderEmails,
    })

    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      toast({
        title: "Validation errors",
        description: "Please fix the errors before scheduling",
        variant: "destructive",
      })
      return
    }

    if (!draftId) {
      toast({
        title: "Save draft first",
        description: "Please save your draft before scheduling",
        variant: "destructive",
      })
      return
    }

    setShowConfirmModal(true)
  }

  async function confirmQueue() {
    if (!draftId) return

    setShowConfirmModal(false)
    setIsQueueing(true)
    try {
      await queueCampaign(draftId)

      toast({
        title: "Campaign queued",
        description: "Your campaign has been queued for sending",
      })

      window.location.href = `/campaigns/${draftId}`
    } catch (error: any) {
      toast({
        title: "Error queueing campaign",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsQueueing(false)
    }
  }

  async function handleSendTest() {
    if (!fromEmail || !subject || !htmlContent || !testEmail) {
      toast({
        title: "Missing fields",
        description: "Please fill in from email, subject, content, and test email address",
        variant: "destructive",
      })
      return
    }

    setIsSendingTest(true)
    try {
      await sendTestEmail({
        from_name: fromName,
        from_email: fromEmail,
        subject,
        html: htmlContent,
        text_fallback: textFallback,
        to: testEmail,
      })

      toast({
        title: "Test email sent",
        description: "Test email sent. Check your inbox.",
      })
    } catch (error: any) {
      toast({
        title: "Error sending test",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  function insertVariable(variable: string) {
    const textarea = document.getElementById("html-content") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = htmlContent.substring(0, start) + variable + htmlContent.substring(end)
    setHtmlContent(newValue)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  function getStatusBadge(status: Campaign["status"]) {
    const variants: Record<
      Campaign["status"],
      { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
    > = {
      draft: { label: "Draft", variant: "secondary", icon: Clock },
      queued: { label: "Queued", variant: "default", icon: Calendar },
      sending: { label: "Sending", variant: "default", icon: Loader2 },
      sent: { label: "Sent", variant: "outline", icon: CheckCircle2 },
      failed: { label: "Failed", variant: "destructive", icon: XCircle },
    }

    const config = variants[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  function getTimeSinceSave() {
    if (!lastSaved) return null

    const now = new Date()
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000 / 60)

    if (diff === 0) return "Saved just now"
    if (diff === 1) return "Saved 1 min ago"
    return `Saved ${diff} min ago`
  }

  const resolvedCount = audienceType === "saved" ? audiences.find((a) => a.id === audienceId)?.preview_count || 0 : 0

  const validation = validateCampaign({
    subject,
    fromEmail,
    audienceType,
    audienceId,
    htmlContent,
    scheduleType,
    scheduledAt,
    senderEmails,
  })

  const canSchedule = Boolean(draftId) && validation.isValid

  const getScheduleTooltip = () => {
    if (!draftId) return "Save draft first"
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0]
      return firstError
    }
    return ""
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl">
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 mb-8 px-4 sm:px-6 lg:px-8 py-8 lg:py-10 border-b bg-gradient-to-br from-blue-50 via-cyan-50/50 to-blue-50 dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
          <div className="flex items-start gap-4 max-w-7xl mx-auto">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Logo size="md" />
              </div>
              <p className="mt-2 text-pretty text-base text-muted-foreground lg:text-lg max-w-3xl">
                Create and manage email campaigns with precision
              </p>
            </div>
          </div>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1.5 pb-6 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">Compose Campaign</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Build your email campaign with all the details below
                </CardDescription>
              </div>
              {lastSaved && (
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 border border-emerald-200 dark:border-emerald-800">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {getTimeSinceSave()}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-0 p-0">
            {/* Campaign Details Section */}
            <div className="space-y-6 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-2 ring-primary/20">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Campaign Details</h3>
                  <p className="text-sm text-muted-foreground">Set up sender and recipient information</p>
                </div>
              </div>

              <div className="space-y-5 pl-13">
                <div className="space-y-2.5">
                  <Label htmlFor="from-name" className="text-sm font-medium">
                    From Name
                  </Label>
                  <Input
                    id="from-name"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Your Name or Company"
                    className="h-11 transition-all focus-visible:ring-2"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="from-email" className="text-sm font-medium">
                    From Email <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingSenders ? (
                    <Skeleton className="h-11 w-full" />
                  ) : (
                    <Select
                      value={fromEmail}
                      onValueChange={(value) => {
                        setFromEmail(value)
                        setValidationErrors((prev) => ({ ...prev, fromEmail: "" }))
                      }}
                    >
                      <SelectTrigger
                        id="from-email"
                        className={`h-11 ${validationErrors.fromEmail ? "border-destructive ring-destructive/20" : ""}`}
                      >
                        <SelectValue placeholder="Select verified sender email" />
                      </SelectTrigger>
                      <SelectContent>
                        {senderEmails.map((email) => (
                          <SelectItem key={email.id} value={email.address} disabled={!email.verified}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {email.display_name} ({email.address})
                              </span>
                              {email.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                              {!email.verified && <AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {validationErrors.fromEmail && (
                    <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {validationErrors.fromEmail}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="subject" className="text-sm font-medium">
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value.slice(0, 120))
                      setValidationErrors((prev) => ({ ...prev, subject: "" }))
                    }}
                    placeholder="Your compelling email subject line"
                    maxLength={120}
                    className={`h-11 ${validationErrors.subject ? "border-destructive ring-destructive/20" : ""}`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={
                        subject.length > 100
                          ? "text-amber-600 dark:text-amber-500 font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {subject.length}/120 characters
                    </span>
                    {validationErrors.subject && (
                      <span className="text-destructive flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {validationErrors.subject}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="preheader" className="text-sm font-medium">
                    Preheader <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="preheader"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="Preview text shown in inbox"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">This appears alongside the subject in email clients</p>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="audience-type" className="text-sm font-medium">
                    Audience <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={audienceType}
                    onValueChange={(v: any) => {
                      setAudienceType(v)
                      setAudienceId("")
                      setValidationErrors((prev) => ({ ...prev, audience: "" }))
                    }}
                  >
                    <SelectTrigger id="audience-type" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waitlist">Waitlist</SelectItem>
                      <SelectItem value="full">Full List</SelectItem>
                      <SelectItem value="saved">Saved Audience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {audienceType === "saved" && (
                  <div className="space-y-2.5">
                    <Label htmlFor="saved-audience" className="text-sm font-medium">
                      Select Audience
                    </Label>
                    {isLoadingAudiences ? (
                      <Skeleton className="h-11 w-full" />
                    ) : (
                      <>
                        <Select
                          value={audienceId}
                          onValueChange={(value) => {
                            setAudienceId(value)
                            setValidationErrors((prev) => ({ ...prev, audience: "" }))
                          }}
                        >
                          <SelectTrigger
                            id="saved-audience"
                            className={`h-11 ${validationErrors.audience ? "border-destructive ring-destructive/20" : ""}`}
                          >
                            <SelectValue placeholder="Choose an audience" />
                          </SelectTrigger>
                          <SelectContent>
                            {audiences.map((aud) => (
                              <SelectItem key={aud.id} value={aud.id}>
                                <div className="flex items-center justify-between gap-4 w-full">
                                  <span>{aud.name}</span>
                                  {aud.preview_count !== undefined && (
                                    <Badge variant="secondary" className="text-xs font-medium">
                                      {aud.preview_count} contacts
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {audienceId && resolvedCount > 0 && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>
                              Will send to <span className="font-semibold text-foreground">{resolvedCount}</span>{" "}
                              contacts
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {validationErrors.audience && (
                      <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {validationErrors.audience}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Email Content Section */}
            <div className="space-y-6 p-6 md:p-8 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-2 ring-primary/20">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Email Content</h3>
                  <p className="text-sm text-muted-foreground">Compose your email message</p>
                </div>
              </div>

              <div className="space-y-5 pl-13">
                <div className="space-y-2.5">
                  <Label htmlFor="html-content" className="text-sm font-medium">
                    HTML Content <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="html-content"
                    value={htmlContent}
                    onChange={(e) => {
                      setHtmlContent(e.target.value)
                      setValidationErrors((prev) => ({ ...prev, htmlBody: "" }))
                    }}
                    placeholder="<h1>Hello {{first_name}}!</h1><p>Your email content...</p>"
                    rows={10}
                    className={`font-mono text-sm resize-none ${validationErrors.htmlBody ? "border-destructive ring-destructive/20" : ""}`}
                  />
                  {validationErrors.htmlBody && (
                    <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {validationErrors.htmlBody}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable("{{first_name}}")}
                      className="h-9 gap-1.5 text-xs font-mono"
                    >
                      <span className="text-muted-foreground">+</span> first_name
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable("{{book_link}}")}
                      className="h-9 gap-1.5 text-xs font-mono"
                    >
                      <span className="text-muted-foreground">+</span> book_link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable("{{discount_code}}")}
                      className="h-9 gap-1.5 text-xs font-mono"
                    >
                      <span className="text-muted-foreground">+</span> discount_code
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="text-fallback" className="text-sm font-medium">
                    Plain-text Fallback <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="text-fallback"
                    value={textFallback}
                    onChange={(e) => setTextFallback(e.target.value)}
                    placeholder="Auto-generated from HTML if left blank"
                    rows={5}
                    className="font-mono text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground">Fallback for email clients that don't support HTML</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Scheduling Section */}
            <div className="space-y-6 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-2 ring-primary/20">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Scheduling</h3>
                  <p className="text-sm text-muted-foreground">Choose when to send your campaign</p>
                </div>
              </div>

              <div className="space-y-4 pl-13">
                <RadioGroup
                  value={scheduleType}
                  onValueChange={(v: any) => {
                    setScheduleType(v)
                    setValidationErrors((prev) => ({ ...prev, schedule: "" }))
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 rounded-lg border-2 p-4 transition-all hover:bg-accent/50 hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="now" id="send-now" className="mt-0.5" />
                    <Label htmlFor="send-now" className="flex-1 cursor-pointer font-normal leading-relaxed">
                      <div className="font-medium">Send immediately</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Campaign will be sent right away</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 rounded-lg border-2 p-4 transition-all hover:bg-accent/50 hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="schedule" id="schedule" className="mt-0.5" />
                    <Label htmlFor="schedule" className="flex-1 cursor-pointer font-normal leading-relaxed">
                      <div className="font-medium">Schedule for later</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Choose a specific date and time</div>
                    </Label>
                  </div>
                </RadioGroup>

                {scheduleType === "schedule" && (
                  <div className="space-y-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-5 mt-4">
                    <Label htmlFor="scheduled-at" className="text-sm font-medium">
                      Date & Time
                    </Label>
                    <Input
                      id="scheduled-at"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => {
                        setScheduledAt(e.target.value)
                        setValidationErrors((prev) => ({ ...prev, schedule: "" }))
                      }}
                      className={`h-11 ${validationErrors.schedule ? "border-destructive ring-destructive/20" : ""}`}
                    />
                    {validationErrors.schedule && (
                      <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {validationErrors.schedule}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">Leave blank to send immediately.</p>
              </div>
            </div>

            <Separator />

            {/* Testing Section */}
            <div className="space-y-6 p-6 md:p-8 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-2 ring-primary/20">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Testing</h3>
                  <p className="text-sm text-muted-foreground">Send a test email to verify your content</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pl-13">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="h-11 flex-1"
                />
                <Button
                  onClick={handleSendTest}
                  disabled={isSendingTest || !fromEmail || !subject || !htmlContent}
                  variant="secondary"
                  size="lg"
                  className="h-11 px-6 sm:w-auto w-full"
                >
                  {isSendingTest ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Test
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-t bg-gradient-to-b from-muted/50 to-muted/30 p-6 md:p-8 sm:flex-row sm:items-center">
            <Button
              onClick={() => handleSaveDraft(false)}
              disabled={isSavingDraft}
              variant="outline"
              size="lg"
              className="w-full h-12 sm:w-auto font-medium"
            >
              {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Draft
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full sm:ml-auto sm:w-auto">
                    <Button
                      onClick={handleScheduleClick}
                      disabled={!canSchedule || isQueueing}
                      size="lg"
                      className="w-full h-12 gap-2 font-semibold text-base bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-lg shadow-orange-600/20 dark:from-orange-500 dark:to-orange-600 dark:hover:from-orange-600 dark:hover:to-orange-700"
                    >
                      {isQueueing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                      Schedule & Send
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canSchedule && (
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm font-medium">{getScheduleTooltip()}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </CardFooter>
        </Card>
      </div>

      <Confirm
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Confirm Campaign Send"
        description={`You're about to send to ${
          audienceType === "saved"
            ? `${resolvedCount} contacts`
            : audienceType === "waitlist"
              ? "waitlist contacts"
              : "all contacts"
        }${
          scheduleType === "schedule" && scheduledAt ? ` on ${new Date(scheduledAt).toLocaleString()}` : " immediately"
        }. Proceed?`}
        onConfirm={confirmQueue}
        onCancel={() => setShowConfirmModal(false)}
        confirmLabel="Confirm Send"
        isLoading={isQueueing}
      />
    </div>
  )
}
