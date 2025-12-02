"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Users, Copy, Edit, Trash2, Plus, Loader2, Target, TrendingUp, Search, Check, X } from "lucide-react"
import { listContacts } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"
import { PageHeader } from "@/components/page-header"

type Contact = {
  id: string
  email: string
  name?: string
  first_name?: string
  last_name?: string
  company?: string
  status: string
}

type Audience = {
  id: string
  name: string
  description?: string
  contact_ids: string[]
  updated_at?: string
  created_at?: string
}

export function AudiencesManagerSimple() {
  const { toast } = useToast()

  const [audiences, setAudiences] = useState<Audience[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewFilter, setViewFilter] = useState<"all" | "selected" | "unselected">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAudience, setEditingAudience] = useState<Audience | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadAudiences()
    loadContacts()
  }, [])

  // Helper function to check if a contact is selected by email (case-insensitive)
  const isContactSelected = (contactEmail: string) => {
    if (!contactEmail) return false
    const normalizedEmail = contactEmail.toLowerCase().trim()
    for (const selectedEmail of selectedContactIds) {
      if (selectedEmail.toLowerCase().trim() === normalizedEmail) {
        return true
      }
    }
    return false
  }

  // Helper function to calculate match score for sorting (higher = better match)
  const getMatchScore = (contact: Contact, query: string): number => {
    if (!query) return 0
    const q = query.toLowerCase()
    const firstName = (contact.first_name || '').toLowerCase()
    const lastName = (contact.last_name || '').toLowerCase()
    const fullName = `${firstName} ${lastName}`.trim()
    const email = (contact.email || '').toLowerCase()
    const displayName = (contact.name || '').toLowerCase()

    // Exact match gets highest score
    if (firstName === q || lastName === q || email === q) return 100
    // Starts with query gets high score
    if (firstName.startsWith(q) || lastName.startsWith(q) || email.startsWith(q) || fullName.startsWith(q)) return 80
    if (displayName.startsWith(q)) return 75
    // Contains query gets medium score
    if (firstName.includes(q) || lastName.includes(q)) return 60
    if (email.includes(q)) return 50
    if (fullName.includes(q) || displayName.includes(q)) return 40
    if ((contact.company || '').toLowerCase().includes(q)) return 20
    return 0
  }

  // Helper to check if contact matches search query
  const contactMatchesSearch = (contact: Contact, query: string): boolean => {
    if (!query) return true
    const q = query.toLowerCase()
    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ').toLowerCase()
    const displayName = (contact.name || '').toLowerCase()
    const email = (contact.email || '').toLowerCase()
    const company = (contact.company || '').toLowerCase()
    const firstName = (contact.first_name || '').toLowerCase()
    const lastName = (contact.last_name || '').toLowerCase()

    return (
      email.includes(q) ||
      displayName.includes(q) ||
      fullName.includes(q) ||
      firstName.includes(q) ||
      lastName.includes(q) ||
      company.includes(q)
    )
  }

  // Calculate actual selected count (contacts that exist and are selected)
  const actualSelectedCount = contacts.filter(c => isContactSelected(c.email)).length
  const actualUnselectedCount = contacts.length - actualSelectedCount

  // Track if search has ANY matches across all contacts (regardless of tab)
  const trimmedSearchQuery = searchQuery.trim().toLowerCase()
  const searchMatchesAll = trimmedSearchQuery === ""
    ? contacts
    : contacts.filter(c => contactMatchesSearch(c, trimmedSearchQuery))
  const hasAnySearchMatch = searchMatchesAll.length > 0
  const noSearchResults = trimmedSearchQuery !== "" && !hasAnySearchMatch

  useEffect(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase()

    // Helper to check if contact is selected (inline to avoid stale closure)
    const checkSelected = (contactId: string) => {
      const normalizedId = contactId.toLowerCase().trim()
      for (const selectedId of selectedContactIds) {
        if (selectedId.toLowerCase().trim() === normalizedId) {
          return true
        }
      }
      return false
    }

    // Helper to check if contact matches search
    const matchesSearch = (contact: Contact, query: string): boolean => {
      if (!query) return true
      const q = query.toLowerCase()
      const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ').toLowerCase()
      const displayName = (contact.name || '').toLowerCase()
      const email = (contact.email || '').toLowerCase()
      const company = (contact.company || '').toLowerCase()
      const firstName = (contact.first_name || '').toLowerCase()
      const lastName = (contact.last_name || '').toLowerCase()

      return (
        email.includes(q) ||
        displayName.includes(q) ||
        fullName.includes(q) ||
        firstName.includes(q) ||
        lastName.includes(q) ||
        company.includes(q)
      )
    }

    // Helper to get match score for sorting
    const getScore = (contact: Contact, query: string): number => {
      if (!query) return 0
      const q = query.toLowerCase()
      const firstName = (contact.first_name || '').toLowerCase()
      const lastName = (contact.last_name || '').toLowerCase()
      const fullName = `${firstName} ${lastName}`.trim()
      const email = (contact.email || '').toLowerCase()
      const displayName = (contact.name || '').toLowerCase()

      if (firstName === q || lastName === q || email === q) return 100
      if (firstName.startsWith(q) || lastName.startsWith(q) || email.startsWith(q) || fullName.startsWith(q)) return 80
      if (displayName.startsWith(q)) return 75
      if (firstName.includes(q) || lastName.includes(q)) return 60
      if (email.includes(q)) return 50
      if (fullName.includes(q) || displayName.includes(q)) return 40
      if ((contact.company || '').toLowerCase().includes(q)) return 20
      return 0
    }

    // Step 1: First filter by search across ALL contacts
    let searchFiltered = contacts
    if (trimmedQuery !== "") {
      searchFiltered = contacts.filter((c) => matchesSearch(c, trimmedQuery))
    }

    // Step 2: Apply view filter (selected/unselected/all) on search results
    let filtered = searchFiltered
    if (viewFilter === "selected") {
      filtered = searchFiltered.filter((c) => checkSelected(c.email))
    } else if (viewFilter === "unselected") {
      filtered = searchFiltered.filter((c) => !checkSelected(c.email))
    }

    // Step 3: Sort results - best matches first, then selected status
    filtered = [...filtered].sort((a, b) => {
      // If searching, sort by match score first
      if (trimmedQuery !== "") {
        const aScore = getScore(a, trimmedQuery)
        const bScore = getScore(b, trimmedQuery)
        if (aScore !== bScore) return bScore - aScore // Higher score first
      }
      // Then by selected status
      const aSelected = checkSelected(a.email) ? 0 : 1
      const bSelected = checkSelected(b.email) ? 0 : 1
      return aSelected - bSelected
    })

    setFilteredContacts(filtered)
  }, [searchQuery, contacts, viewFilter, selectedContactIds])

  async function loadAudiences() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/audiences")
      if (!response.ok) throw new Error("Failed to load audiences")
      const data = await response.json()
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

  async function loadContacts() {
    setIsLoadingContacts(true)
    try {
      const data = await listContacts()
      // Deduplicate contacts by email to avoid React key issues
      const seen = new Set<string>()
      const uniqueContacts = data.filter((contact: Contact) => {
        const email = contact.email?.toLowerCase()
        if (!email || seen.has(email)) return false
        seen.add(email)
        return true
      })
      setContacts(uniqueContacts)
      // Don't set filteredContacts here - let useEffect handle filtering
    } catch (error: any) {
      toast({
        title: "Error loading contacts",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoadingContacts(false)
    }
  }

  function openCreateModal() {
    setEditingAudience(null)
    setName("")
    setDescription("")
    setSelectedContactIds(new Set())
    setSearchQuery("")
    setViewFilter("all")
    setIsModalOpen(true)
  }

  function openEditModal(audience: Audience) {
    setEditingAudience(audience)
    setName(audience.name)
    setDescription(audience.description || "")
    setSelectedContactIds(new Set(audience.contact_ids || []))
    setSearchQuery("")
    setViewFilter("selected") // Default to showing selected when editing
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

    if (actualSelectedCount === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      // Get actual email addresses for selected contacts
      const validContactEmails = contacts
        .filter(c => isContactSelected(c.email))
        .map(c => c.email)
        .filter(email => email) // Filter out any null/undefined emails

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        contact_ids: validContactEmails, // These are actually emails, not IDs
      }

      console.log("Saving audience with payload:", payload)

      const url = editingAudience ? `/api/audiences/${editingAudience.id}` : "/api/audiences"
      const method = editingAudience ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log("Response from API:", data)

      if (!response.ok) {
        throw new Error(data.message || "Failed to save audience")
      }

      toast({
        title: editingAudience ? "Audience updated" : "Audience created",
        description: `Your audience has been ${editingAudience ? "updated" : "created"} successfully`,
      })

      setIsModalOpen(false)
      await loadAudiences()
    } catch (error: any) {
      console.error("Error saving audience:", error)
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
      const response = await fetch("/api/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${audience.name} (Copy)`,
          description: audience.description,
          contact_ids: audience.contact_ids,
        }),
      })

      if (!response.ok) throw new Error("Failed to duplicate audience")

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
      const response = await fetch(`/api/audiences/${audience.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete audience")

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

  function toggleContact(contactId: string) {
    const newSet = new Set(selectedContactIds)
    // Check if already selected (case-insensitive)
    let existingId: string | null = null
    for (const id of newSet) {
      if (id.toLowerCase().trim() === contactId.toLowerCase().trim()) {
        existingId = id
        break
      }
    }
    if (existingId) {
      newSet.delete(existingId)
    } else {
      newSet.add(contactId)
    }
    setSelectedContactIds(newSet)
  }

  function toggleSelectAll() {
    const newSet = new Set(selectedContactIds)

    // Check if all filtered contacts are currently selected
    const allFilteredSelected = filteredContacts.every(c => isContactSelected(c.email))

    if (allFilteredSelected && filteredContacts.length > 0) {
      // Deselect only the filtered contacts (keep others selected)
      for (const contact of filteredContacts) {
        // Find and remove the matching email (case-insensitive)
        for (const email of newSet) {
          if (email.toLowerCase().trim() === contact.email.toLowerCase().trim()) {
            newSet.delete(email)
            break
          }
        }
      }
    } else {
      // Select all filtered contacts (add to existing selection)
      for (const contact of filteredContacts) {
        // Only add if not already selected
        if (!isContactSelected(contact.email)) {
          newSet.add(contact.email)
        }
      }
    }

    setSelectedContactIds(newSet)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl">
        <PageHeader
          title="Audiences"
          description="Create and manage subscriber groups for targeted campaigns"
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
                    <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
                    <p className="text-2xl font-bold">{contacts.length.toLocaleString()}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">Avg. Group Size</p>
                    <p className="text-2xl font-bold">
                      {audiences.length > 0
                        ? Math.round(
                            audiences.reduce((sum, a) => sum + (a.contact_ids?.length || 0), 0) / audiences.length
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
                Create your first audience group to organize your subscribers.
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
                        {/* <Button
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
                        </Button> */}
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
                          <p className="text-xs text-muted-foreground">Subscribers</p>
                          <p className="text-lg font-semibold">
                            {audience.contact_ids?.length?.toLocaleString() || 0}
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
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden flex flex-col">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-2xl font-bold">
                {editingAudience ? "Edit Audience" : "New Audience"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select subscribers to add to this audience group
              </p>
            </DialogHeader>

            <div className="space-y-6 py-6 flex-1 overflow-y-auto">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">
                    Audience Name <span className="text-red-500">*</span>
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
                    placeholder="Describe this audience group..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <Label className="text-base font-semibold">Select Subscribers</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-primary">{actualSelectedCount}</span> of {contacts.length} selected
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={toggleSelectAll}
                    className="h-9"
                  >
                    {filteredContacts.length > 0 && filteredContacts.every(c => isContactSelected(c.email)) ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewFilter("all")}
                    className={`flex-1  text-xs sm:text-sm font-medium rounded-lg border-2 transition-all ${
                      viewFilter === "all"
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    All ({contacts.length})
                  </button>
                  <button
                    onClick={() => setViewFilter("selected")}
                    className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-1 ${
                      viewFilter === "selected"
                        ? " text-white bg-green-500 border-green-500 shadow-md"
                        : "bg-background text-muted-foreground border-border hover:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-950/20"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    Selected ({actualSelectedCount})
                  </button>
                  <button
                    onClick={() => setViewFilter("unselected")}
                    className={`flex-1  text-xs sm:text-sm font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-1 ${
                      viewFilter === "unselected"
                        ? "bg-orange-500 text-white border-orange-500 shadow-md"
                        : "bg-background text-muted-foreground border-border hover:border-orange-500/50 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    }`}
                  >
                    <X className="h-3 w-3" />
                    Unselected ({actualUnselectedCount})
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {trimmedSearchQuery !== "" && (
                    <p className="text-xs text-muted-foreground px-1">
                      {noSearchResults ? (
                        <span className="text-red-500">No results found</span>
                      ) : (
                        <>
                          Found <span className="font-semibold text-foreground">{searchMatchesAll.length}</span> subscriber{searchMatchesAll.length !== 1 ? 's' : ''} matching "{searchQuery}"
                          {viewFilter !== "all" && filteredContacts.length !== searchMatchesAll.length && (
                            <span> ({filteredContacts.length} in current view)</span>
                          )}
                        </>
                      )}
                    </p>
                  )}
                </div>

                <Card className="border-2 max-h-96 overflow-y-auto">
                  {isLoadingContacts ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : noSearchResults ? (
                    <div className="text-center py-10">
                      <div className="text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="font-medium">No subscriber found for "{searchQuery}"</p>
                        <p className="text-sm mt-1">Try a different name or email</p>
                      </div>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      {trimmedSearchQuery !== "" ? (
                        <div>
                          <p className="font-medium">No {viewFilter === "selected" ? "selected" : "unselected"} subscribers match "{searchQuery}"</p>
                          <p className="text-sm mt-1">
                            {searchMatchesAll.length} subscriber{searchMatchesAll.length !== 1 ? 's' : ''} found in total -
                            <button
                              onClick={() => setViewFilter("all")}
                              className="text-primary hover:underline ml-1"
                            >
                              view all results
                            </button>
                          </p>
                        </div>
                      ) : viewFilter === "selected" ? (
                        <p>No subscribers selected yet</p>
                      ) : viewFilter === "unselected" ? (
                        <p>All subscribers are selected</p>
                      ) : (
                        <p>No subscribers found</p>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredContacts.map((contact, index) => {
                        const isSelected = isContactSelected(contact.email)
                        const displayName = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email
                        return (
                          <div
                            key={`${contact.id}-${index}`}
                            className={`flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                              isSelected ? "bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500" : ""
                            }`}
                            onClick={() => toggleContact(contact.email)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleContact(contact.email)}
                              className="h-5 w-5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isSelected ? "text-green-700 dark:text-green-400" : ""}`}>
                                {displayName}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                              {contact.company && (
                                <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
                              )}
                            </div>
                            {isSelected ? (
                              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                                <Check className="h-3 w-3" />
                                In Audience
                              </span>
                            ) : (contact.status === "subscribed" || contact.status === "active") ? (
                              <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-1 rounded-full flex-shrink-0">
                                Active
                              </span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              </div>

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
                  disabled={isSaving || !name.trim() || actualSelectedCount === 0}
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
