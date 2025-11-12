"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Users, Copy, Edit, Trash2, Plus, Loader2, X, TrendingUp, Target } from "lucide-react"
import { listAudiences, createAudience, updateAudience, deleteAudience, previewAudience } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"
import { PageHeader } from "@/components/page-header"

type Audience = {
  id: string
  name: string
  description?: string
  preview_count?: number
  rules?: any
  updated_at?: string
  created_at?: string
}

type Rule = {
  field: "tag" | "unsubscribed" | "opened_any" | "clicked_any" | "created_at"
  operator: "includes" | "is" | "between"
  value: any
}

type RuleGroup = {
  operator: "AND" | "OR"
  rules: Rule[]
}

export function AudiencesManager() {
  const { toast } = useToast()

  const [audiences, setAudiences] = useState<Audience[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAudience, setEditingAudience] = useState<Audience | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([
    { operator: "AND", rules: [{ field: "unsubscribed", operator: "is", value: false }] },
  ])
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadAudiences()
  }, [])

  useEffect(() => {
    if (!isModalOpen) return

    const timer = setTimeout(() => {
      loadPreviewCount()
    }, 500)

    return () => clearTimeout(timer)
  }, [ruleGroups, isModalOpen])

  async function loadAudiences() {
    setIsLoading(true)
    try {
      const data = await listAudiences()
      setAudiences(data)
    } catch (error: any) {
      toast({
        title: "Error loading audiences",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function loadPreviewCount() {
    setIsLoadingPreview(true)
    try {
      const result = await previewAudience(ruleGroups)
      setPreviewCount(result.count)
    } catch (error: any) {
      setPreviewCount(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  function openCreateModal() {
    setEditingAudience(null)
    setName("")
    setDescription("")
    setRuleGroups([{ operator: "AND", rules: [{ field: "unsubscribed", operator: "is", value: false }] }])
    setPreviewCount(null)
    setIsModalOpen(true)
  }

  function openEditModal(audience: Audience) {
    setEditingAudience(audience)
    setName(audience.name)
    setDescription(audience.description || "")
    setRuleGroups(
      audience.rules || [{ operator: "AND", rules: [{ field: "unsubscribed", operator: "is", value: false }] }],
    )
    setPreviewCount(audience.preview_count || null)
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter an audience name",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        rules: ruleGroups,
      }

      if (editingAudience) {
        await updateAudience(editingAudience.id, payload)
        toast({
          title: "Audience updated",
          description: "Your audience has been updated successfully",
        })
      } else {
        await createAudience(payload)
        toast({
          title: "Audience created",
          description: "Your audience has been created successfully",
        })
      }

      setIsModalOpen(false)
      await loadAudiences()
    } catch (error: any) {
      toast({
        title: editingAudience ? "Error updating audience" : "Error creating audience",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDuplicate(audience: Audience) {
    try {
      await createAudience({
        name: `${audience.name} (Copy)`,
        description: audience.description,
        rules: audience.rules,
      })
      toast({
        title: "Audience duplicated",
        description: "A copy of the audience has been created",
      })
      await loadAudiences()
    } catch (error: any) {
      toast({
        title: "Error duplicating audience",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleDelete(audience: Audience) {
    if (!confirm(`Are you sure you want to delete "${audience.name}"?`)) {
      return
    }

    try {
      await deleteAudience(audience.id)
      toast({
        title: "Audience deleted",
        description: "The audience has been deleted successfully",
      })
      await loadAudiences()
    } catch (error: any) {
      toast({
        title: "Error deleting audience",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  function addRuleGroup() {
    setRuleGroups([...ruleGroups, { operator: "AND", rules: [{ field: "tag", operator: "includes", value: "" }] }])
  }

  function removeRuleGroup(groupIndex: number) {
    setRuleGroups(ruleGroups.filter((_, i) => i !== groupIndex))
  }

  function updateGroupOperator(groupIndex: number, operator: "AND" | "OR") {
    const updated = [...ruleGroups]
    updated[groupIndex].operator = operator
    setRuleGroups(updated)
  }

  function addRule(groupIndex: number) {
    const updated = [...ruleGroups]
    updated[groupIndex].rules.push({ field: "tag", operator: "includes", value: "" })
    setRuleGroups(updated)
  }

  function removeRule(groupIndex: number, ruleIndex: number) {
    const updated = [...ruleGroups]
    updated[groupIndex].rules.splice(ruleIndex, 1)
    setRuleGroups(updated)
  }

  function updateRule(groupIndex: number, ruleIndex: number, updates: Partial<Rule>) {
    const updated = [...ruleGroups]
    updated[groupIndex].rules[ruleIndex] = { ...updated[groupIndex].rules[ruleIndex], ...updates }
    setRuleGroups(updated)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl">
        <PageHeader
          title="Audiences"
          description="Create and manage segmented audiences for targeted campaigns"
          icon={Target}
          variant="gradient"
          action={
            <Button
              onClick={openCreateModal}
              size="lg"
              className="shadow-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Audience
            </Button>
          }
        />

        {!isLoading && audiences.length > 0 && (
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 ring-2 ring-blue-500/10">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Audiences</p>
                    <p className="text-2xl font-bold">{audiences.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-cyan-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-2 ring-cyan-500/10">
                    <Target className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                    <p className="text-2xl font-bold">
                      {audiences.reduce((sum, a) => sum + (a.preview_count || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 ring-2 ring-orange-500/10">
                    <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Size</p>
                    <p className="text-2xl font-bold">
                      {audiences.length > 0
                        ? Math.round(
                            audiences.reduce((sum, a) => sum + (a.preview_count || 0), 0) / audiences.length,
                          ).toLocaleString()
                        : "0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">Loading audiences...</p>
            </div>
          </div>
        ) : audiences.length === 0 ? (
          <Card className="border-2 border-dashed shadow-none">
            <div className="py-20 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No audiences yet</h3>
              <p className="mb-6 text-muted-foreground">
                Create your first saved audience to target specific segments of your contacts.
              </p>
              <Button onClick={openCreateModal} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Audience
              </Button>
            </div>
          </Card>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{audiences.length} audiences</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {audiences.map((audience) => (
                <Card
                  key={audience.id}
                  className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl"
                  onClick={() => openEditModal(audience)}
                >
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600" />
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="mb-1 text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
                          {audience.name}
                        </h3>
                        {audience.description && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">{audience.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicate(audience)
                          }}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-green-100 hover:text-green-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(audience)
                          }}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(audience)
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Contacts</p>
                          <p className="text-lg font-semibold">
                            {audience.preview_count !== undefined ? audience.preview_count.toLocaleString() : "—"}
                          </p>
                        </div>
                      </div>
                      {audience.updated_at && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Updated</p>
                          <p className="text-xs font-medium">
                            {formatDistanceToNow(new Date(audience.updated_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-2xl font-bold">
                {editingAudience ? "Edit Audience" : "New Audience"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define rules to segment your contacts into targeted audiences
              </p>
            </DialogHeader>

            <div className="space-y-6 py-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Active Subscribers"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Description <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contacts who have opened at least one email..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <Label className="text-base font-semibold">Rules</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Combine multiple conditions to refine your audience
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addRuleGroup}
                    className="h-9 bg-transparent"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Group
                  </Button>
                </div>

                <div className="space-y-3">
                  {ruleGroups.map((group, groupIndex) => (
                    <Card key={groupIndex} className="border-2 shadow-sm">
                      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-lg" />
                      <CardContent className="p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Group Operator:</span>
                            <Select
                              value={group.operator}
                              onValueChange={(value: "AND" | "OR") => updateGroupOperator(groupIndex, value)}
                            >
                              <SelectTrigger className="w-28 h-9 font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {ruleGroups.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeRuleGroup(groupIndex)}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {group.rules.map((rule, ruleIndex) => (
                            <div key={ruleIndex} className="flex gap-2 items-start">
                              <Select
                                value={rule.field}
                                onValueChange={(value: any) =>
                                  updateRule(groupIndex, ruleIndex, {
                                    field: value,
                                    operator: value === "tag" ? "includes" : value === "created_at" ? "between" : "is",
                                    value: value === "unsubscribed" ? false : value === "created_at" ? ["", ""] : "",
                                  })
                                }
                              >
                                <SelectTrigger className="w-44 h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tag">Tag</SelectItem>
                                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                                  <SelectItem value="opened_any">Opened Any</SelectItem>
                                  <SelectItem value="clicked_any">Clicked Any</SelectItem>
                                  <SelectItem value="created_at">Created At</SelectItem>
                                </SelectContent>
                              </Select>

                              {rule.field === "tag" && (
                                <>
                                  <Select value="includes" disabled>
                                    <SelectTrigger className="w-32 h-10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="includes">includes</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    placeholder="newsletter"
                                    value={rule.value}
                                    onChange={(e) => updateRule(groupIndex, ruleIndex, { value: e.target.value })}
                                    className="flex-1 h-10"
                                  />
                                </>
                              )}

                              {(rule.field === "unsubscribed" ||
                                rule.field === "opened_any" ||
                                rule.field === "clicked_any") && (
                                <>
                                  <Select value="is" disabled>
                                    <SelectTrigger className="w-24 h-10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="is">is</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={rule.value ? "true" : "false"}
                                    onValueChange={(value) =>
                                      updateRule(groupIndex, ruleIndex, { value: value === "true" })
                                    }
                                  >
                                    <SelectTrigger className="flex-1 h-10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">True</SelectItem>
                                      <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </>
                              )}

                              {rule.field === "created_at" && (
                                <>
                                  <Select value="between" disabled>
                                    <SelectTrigger className="w-32 h-10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="between">between</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="date"
                                    value={rule.value?.[0] || ""}
                                    onChange={(e) =>
                                      updateRule(groupIndex, ruleIndex, {
                                        value: [e.target.value, rule.value?.[1] || ""],
                                      })
                                    }
                                    className="flex-1 h-10"
                                  />
                                  <span className="flex items-center text-sm text-muted-foreground px-1">and</span>
                                  <Input
                                    type="date"
                                    value={rule.value?.[1] || ""}
                                    onChange={(e) =>
                                      updateRule(groupIndex, ruleIndex, {
                                        value: [rule.value?.[0] || "", e.target.value],
                                      })
                                    }
                                    className="flex-1 h-10"
                                  />
                                </>
                              )}

                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeRule(groupIndex, ruleIndex)}
                                disabled={group.rules.length === 1}
                                className="h-10 w-10 flex-shrink-0 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => addRule(groupIndex)}
                            className="h-9 mt-2"
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Rule
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-blue-500/5 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-600 shadow-lg ring-2 ring-blue-500/20">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      {isLoadingPreview ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-sm font-medium text-muted-foreground">Calculating matches...</span>
                        </div>
                      ) : previewCount !== null ? (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Audience Preview
                          </p>
                          <p className="text-xl font-bold">
                            Matches{" "}
                            <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-cyan-400 dark:to-blue-300">
                              {previewCount.toLocaleString()}
                            </span>{" "}
                            {previewCount === 1 ? "contact" : "contacts"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Preview unavailable</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="flex-1 h-11"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !name.trim()}
                  className="flex-1 h-11 shadow-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>{editingAudience ? "Update Audience" : "Save Audience"}</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
