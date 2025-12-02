"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { useToast } from "@/hooks/use-toast"
import { getSettings, updateSettings, listSenderEmails, createSenderEmail } from "@/lib/api"
import {
  Copy,
  Plus,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  RotateCw,
  Mail,
  Shield,
  Settings2,
  Upload,
  X,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"

export function SettingsManager() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Settings
  const [settings, setSettings] = useState({
    default_book_link: "",
    default_discount_code: "",
    brand_logo_url: "",
  })

  // Sender Emails
  const [senderEmails, setSenderEmails] = useState<any[]>([])

  const [verifiedDomains, setVerifiedDomains] = useState<string[]>([])

  // Add From Email Modal
  const [showAddEmail, setShowAddEmail] = useState(false)
  const [newEmail, setNewEmail] = useState({ display_name: "", address: "" })
  const [addingEmail, setAddingEmail] = useState(false)

  const [signingSecret, setSigningSecret] = useState("sk_live_a1b2c3d4e5f6g7h8i9j0")
  const [secretRevealed, setSecretRevealed] = useState(false)
  const [showRotateConfirm, setShowRotateConfirm] = useState(false)
  const [webhookUrl] = useState(
    `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/email-events`,
  )

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showLogoUpload, setShowLogoUpload] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoSize, setLogoSize] = useState({ width: 200, height: 0 }) // height 0 = auto
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [settingsData, emailsData] = await Promise.all([getSettings(), listSenderEmails()])
      setSettings(settingsData)
      setSenderEmails(emailsData)

      const domains = new Set<string>()
      emailsData.forEach((email: any) => {
        if (email.verified) {
          const domain = email.address.split("@")[1]
          if (domain) domains.add(domain)
        }
      })
      setVerifiedDomains(Array.from(domains))
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to load settings",
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    try {
      await updateSettings(settings)
      toast({
        title: "Settings saved",
        description: "Your default values have been updated successfully.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: error.message,
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleAddFromEmail() {
    if (!newEmail.display_name || !newEmail.address) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in both display name and email address.",
      })
      return
    }

    setAddingEmail(true)
    try {
      await createSenderEmail(newEmail)
      toast({
        title: "Sender email added",
        description: "We'll verify domain DNS (SPF/DKIM). Check your email provider's documentation.",
      })
      setShowAddEmail(false)
      setNewEmail({ display_name: "", address: "" })
      // Refresh sender emails list
      await loadData()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to add email",
        description: error.message,
      })
    } finally {
      setAddingEmail(false)
    }
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied.`,
    })
  }

  function handleRotateSecret() {
    const newSecret = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    setSigningSecret(newSecret)
    setShowRotateConfirm(false)
    toast({
      title: "Signing secret rotated",
      description: "Update your webhook configuration with the new secret.",
    })
  }

  function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image.",
      })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
      })
      return
    }

    setLogoFile(file)

    // Create preview and get dimensions
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setLogoPreview(dataUrl)

      // Get original dimensions
      const img = new Image()
      img.onload = () => {
        setOriginalDimensions({ width: img.width, height: img.height })
        // Set initial size (max 400px width, maintain aspect ratio)
        const initialWidth = Math.min(img.width, 400)
        setLogoSize({ width: initialWidth, height: 0 })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  async function handleLogoUpload() {
    if (!logoFile) return

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', logoFile)
      if (logoSize.width > 0) {
        formData.append('width', logoSize.width.toString())
      }
      if (logoSize.height > 0 && !maintainAspectRatio) {
        formData.append('height', logoSize.height.toString())
      }

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to upload image')
      }

      const result = await response.json()

      // Update settings with the new logo URL
      setSettings({ ...settings, brand_logo_url: result.url })

      // Reset upload state
      setShowLogoUpload(false)
      setLogoFile(null)
      setLogoPreview(null)

      toast({
        title: "Logo uploaded",
        description: "Your brand logo has been uploaded. Don't forget to save settings.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  function handleCancelLogoUpload() {
    setShowLogoUpload(false)
    setLogoFile(null)
    setLogoPreview(null)
    setLogoSize({ width: 200, height: 0 })
  }

  function calculateHeight(width: number): number {
    if (originalDimensions.width === 0) return 0
    return Math.round((width / originalDimensions.width) * originalDimensions.height)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl">
        <PageHeader
          title="Settings"
          description="Manage your email sending configuration and API access"
          icon={Settings2}
          variant="default"
        />

        <Tabs defaultValue="sender" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="sender" className="gap-2 py-3">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Sender</span>
            </TabsTrigger>
            <TabsTrigger value="defaults" className="gap-2 py-3">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Defaults</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2 py-3">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">API/Webhooks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sender" className="space-y-6 pt-6">
            <Card className="overflow-hidden border-t-4 border-t-green-500">
              <CardHeader className="bg-gradient-to-br from-green-50 to-background dark:from-green-950/20 dark:to-background">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 ring-4 ring-green-50 dark:ring-green-900/20">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Verified Sender Domains</CardTitle>
                    <CardDescription>Domains verified for sending emails</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {verifiedDomains.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No verified domains yet. Add a sender email to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {verifiedDomains.map((domain) => (
                      <div
                        key={domain}
                        className="group flex items-center gap-3 rounded-lg border-2 bg-gradient-to-r from-green-50/50 to-background dark:from-green-950/10 dark:to-background px-5 py-4 transition-all hover:border-green-200 dark:hover:border-green-800 hover:shadow-sm"
                      >
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                        <span className="font-mono text-sm font-semibold">{domain}</span>
                        <Badge
                          variant="secondary"
                          className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium"
                        >
                          Verified
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-muted/30 to-background dark:from-muted/50 dark:to-background">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/90 ring-4 ring-primary/5 dark:ring-primary/70">
                    <Mail className="h-5 w-5 text-primary dark:text-primary/80" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">From Emails</CardTitle>
                    <CardDescription>Manage sender email addresses available for campaigns</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
                  {senderEmails.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
                      <p className="text-sm text-muted-foreground">No sender emails configured yet.</p>
                    </div>
                  ) : (
                    senderEmails.map((email) => (
                      <div
                        key={email.id}
                        className="group flex items-center justify-between gap-4 rounded-lg border-2 bg-background dark:bg-background px-5 py-4 transition-all hover:border-primary/20 dark:hover:border-primary/60 hover:shadow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">{email.display_name}</div>
                          <div className="font-mono text-sm text-muted-foreground dark:text-muted-foreground/80 truncate">
                            {email.address}
                          </div>
                        </div>
                        {email.verified && (
                          <CheckCircle2
                            className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400"
                            title="Verified"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Dialog open={showAddEmail} onOpenChange={setShowAddEmail}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full sm:w-auto shadow-sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Sender
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Add Sender Email</DialogTitle>
                      <DialogDescription className="space-y-3 pt-2">
                        <span className="block text-sm">Add a new sender email address for your campaigns.</span>
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 dark:text-amber-300">
                          <p className="font-medium mb-1">Domain Verification Required</p>
                          <p>
                            We'll verify domain DNS (SPF/DKIM).{" "}
                            <a
                              href="https://docs.example.com/dns-verification"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-amber-900 underline hover:text-amber-950 dark:hover:text-amber-400"
                            >
                              Learn more
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </p>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="display-name" className="text-sm font-medium">
                          From Name
                        </Label>
                        <Input
                          id="display-name"
                          placeholder="John Doe"
                          value={newEmail.display_name}
                          onChange={(e) => setNewEmail({ ...newEmail, display_name: e.target.value })}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm font-medium">
                          From Email
                        </Label>
                        <Input
                          id="address"
                          type="email"
                          placeholder="john@example.com"
                          value={newEmail.address}
                          onChange={(e) => setNewEmail({ ...newEmail, address: e.target.value })}
                          className="h-11"
                        />
                      </div>
                      <Button onClick={handleAddFromEmail} disabled={addingEmail} className="w-full h-11 shadow-sm">
                        {addingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Sender Email"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defaults" className="space-y-6 pt-6">
            <Card className="overflow-hidden border-t-4 border-t-blue-500">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20 dark:to-background">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 ring-4 ring-blue-50 dark:ring-blue-900/20">
                    <Settings2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Default Campaign Values</CardTitle>
                    <CardDescription>Set default values that can be inserted into your email campaigns</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-3">
                  <Label htmlFor="book-link" className="text-sm font-medium">
                    Default Book Link
                  </Label>
                  <Input
                    id="book-link"
                    placeholder="https://calendly.com/your-link"
                    value={settings.default_book_link}
                    onChange={(e) => setSettings({ ...settings, default_book_link: e.target.value })}
                    className="h-11"
                  />
                  {settings.default_book_link && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <p className="text-xs text-blue-900">
                        <span className="font-medium">Preview:</span>{" "}
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded">{"{{book_link}}"}</span>{" "}
                        <span className="text-blue-600">→</span>{" "}
                        <span className="font-mono text-blue-700">{settings.default_book_link}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="discount-code" className="text-sm font-medium">
                    Default Discount Code
                  </Label>
                  <Input
                    id="discount-code"
                    placeholder="WELCOME20"
                    value={settings.default_discount_code}
                    onChange={(e) => setSettings({ ...settings, default_discount_code: e.target.value })}
                    className="h-11"
                  />
                  {settings.default_discount_code && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <p className="text-xs text-blue-900">
                        <span className="font-medium">Preview:</span>{" "}
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded">{"{{discount_code}}"}</span>{" "}
                        <span className="text-blue-600">→</span>{" "}
                        <span className="font-mono text-blue-700">{settings.default_discount_code}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="logo-url" className="text-sm font-medium">
                    Brand Logo URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="logo-url"
                      placeholder="https://example.com/logo.png"
                      value={settings.brand_logo_url}
                      onChange={(e) => setSettings({ ...settings, brand_logo_url: e.target.value })}
                      className="h-11"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLogoUpload(true)}
                      className="h-11 px-4 flex-shrink-0"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>

                  {/* Logo Upload Modal */}
                  {showLogoUpload && (
                    <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Upload Brand Logo</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleCancelLogoUpload}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {!logoPreview ? (
                        <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">Click to select an image</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">JPEG, PNG, GIF, or WebP (max 5MB)</p>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleLogoFileSelect}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="space-y-4">
                          {/* Preview */}
                          <div className="rounded-lg bg-white border p-4 flex items-center justify-center">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              style={{
                                width: logoSize.width,
                                height: maintainAspectRatio ? 'auto' : logoSize.height || 'auto',
                              }}
                              className="object-contain max-w-full"
                            />
                          </div>

                          {/* Resize Controls */}
                          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">Resize Image</p>
                              <p className="text-xs text-muted-foreground">
                                Original: {originalDimensions.width} × {originalDimensions.height}px
                              </p>
                            </div>

                            {/* Width Slider */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Width</Label>
                                <span className="text-xs font-mono text-muted-foreground">
                                  {logoSize.width}px
                                </span>
                              </div>
                              <Slider
                                value={[logoSize.width]}
                                onValueChange={([value]) => setLogoSize({ ...logoSize, width: value })}
                                min={50}
                                max={Math.min(originalDimensions.width, 800)}
                                step={10}
                                className="w-full"
                              />
                            </div>

                            {/* Calculated Height Display */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Output size:</span>
                              <span className="font-mono">
                                {logoSize.width} × {calculateHeight(logoSize.width)}px
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setLogoFile(null)
                                setLogoPreview(null)
                              }}
                              className="flex-1"
                            >
                              Choose Different
                            </Button>
                            <Button
                              type="button"
                              onClick={handleLogoUpload}
                              disabled={uploadingLogo}
                              className="flex-1"
                            >
                              {uploadingLogo ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload Logo
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {settings.brand_logo_url && !showLogoUpload && (
                    <div className="rounded-lg border-2 bg-gradient-to-br from-muted/30 to-background dark:from-muted/50 dark:to-background p-5">
                      <p className="mb-3 text-xs font-semibold text-muted-foreground dark:text-muted-foreground/80 uppercase tracking-wide">
                        Logo Preview
                      </p>
                      <div className="flex items-center justify-center rounded-lg bg-white border p-4">
                        <img
                          src={settings.brand_logo_url || "/placeholder.svg"}
                          alt="Brand logo preview"
                          className="h-20 max-w-full object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    size="lg"
                    className="w-full sm:w-auto shadow-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6 pt-6">
            <Card className="overflow-hidden border-t-4 border-t-purple-500">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20 dark:to-background">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 ring-4 ring-purple-50 dark:ring-purple-900/20">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Webhook Configuration</CardTitle>
                    <CardDescription>
                      Configure your email service provider to send events to this endpoint
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="font-mono text-xs h-11 bg-muted/50 dark:bg-muted/70"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(webhookUrl, "Webhook URL")}
                      title="Copy to clipboard"
                      className="h-11 w-11 flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/80 leading-relaxed">
                    Configure your email provider to POST events (delivered, opened, clicked, bounced) to this URL.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Signing Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      type={secretRevealed ? "text" : "password"}
                      value={signingSecret}
                      readOnly
                      className="font-mono text-xs h-11 bg-muted/50 dark:bg-muted/70"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSecretRevealed(!secretRevealed)}
                      title={secretRevealed ? "Hide secret" : "Reveal secret"}
                      className="h-11 w-11 flex-shrink-0"
                    >
                      {secretRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(signingSecret, "Signing secret")}
                      title="Copy to clipboard"
                      className="h-11 w-11 flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/80 leading-relaxed">
                    Use this secret to verify webhook signatures and ensure requests are from your email provider.
                  </p>
                </div>

                <div className="pt-2">
                  <Button variant="outline" onClick={() => setShowRotateConfirm(true)} className="h-11">
                    <RotateCw className="mr-2 h-4 w-4" />
                    Rotate Secret
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Example Webhook Payload</CardTitle>
                <CardDescription>Sample JSON structure for incoming email events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="overflow-x-auto rounded-lg bg-slate-950 p-5 text-xs text-slate-50 dark:text-slate-400 shadow-inner">
                  {JSON.stringify(
                    {
                      event: "delivered",
                      campaign_id: "cmp_abc123",
                      contact_id: "cnt_xyz789",
                      email: "user@example.com",
                      timestamp: "2025-01-12T10:30:00Z",
                      message_id: "msg_def456",
                    },
                    null,
                    2,
                  )}
                </pre>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-xs dark:bg-muted/50">
                  <p className="font-medium text-foreground dark:text-foreground/90">
                    <strong>Supported Events:</strong> delivered, opened, clicked, bounced, complained
                  </p>
                  <p className="text-muted-foreground dark:text-muted-foreground/80">
                    <strong className="text-foreground dark:text-foreground/90">Note:</strong>{" "}
                    <span className="font-mono bg-background px-1.5 py-0.5 rounded">clicked</span> events also include a{" "}
                    <span className="font-mono bg-background px-1.5 py-0.5 rounded">url</span> field
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showRotateConfirm} onOpenChange={setShowRotateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate signing secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new signing secret. You'll need to update your webhook configuration with the new
              secret. The old secret will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotateSecret}>Rotate Secret</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
