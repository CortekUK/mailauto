"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Loader2,
  Plus,
  Tag,
  UserX,
  Trash2,
  X,
  Mail,
  Calendar,
  BarChart3,
  FileUp,
  Users,
  UserCheck,
  UserMinus,
  Clock,
  Filter,
} from "lucide-react"
import {
  listContacts,
  createContact,
  updateContact,
  deleteContacts,
  bulkAddTag,
  bulkRemoveTag,
  bulkUnsubscribe,
  importContacts,
} from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/page-header"

type Contact = {
  id: string
  email: string
  first_name?: string
  tags?: string[]
  unsubscribed_at?: string | null
  opened_any?: boolean
  clicked_any?: boolean
  opens_count?: number
  clicks_count?: number
  created_at?: string
}

export function ContactsManager() {
  const { toast } = useToast()

  // State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "unsubscribed">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Add Contact form
  const [newEmail, setNewEmail] = useState("")
  const [newFirstName, setNewFirstName] = useState("")
  const [newTags, setNewTags] = useState("")

  // Bulk actions
  const [bulkTagInput, setBulkTagInput] = useState("")
  const [showBulkTagAdd, setShowBulkTagAdd] = useState(false)
  const [showBulkTagRemove, setShowBulkTagRemove] = useState(false)

  // Edit drawer
  const [editFirstName, setEditFirstName] = useState("")
  const [editTags, setEditTags] = useState("")
  const [editUnsubscribed, setEditUnsubscribed] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)

  const stats = {
    total: contacts.length,
    active: contacts.filter((c) => !c.unsubscribed_at).length,
    unsubscribed: contacts.filter((c) => c.unsubscribed_at).length,
  }

  // Load contacts with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      loadContacts()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    let filtered = contacts
    if (statusFilter === "active") {
      filtered = contacts.filter((c) => !c.unsubscribed_at)
    } else if (statusFilter === "unsubscribed") {
      filtered = contacts.filter((c) => c.unsubscribed_at)
    }
    setFilteredContacts(filtered)
  }, [contacts, statusFilter])

  async function loadContacts() {
    setIsLoading(true)
    try {
      const data = await listContacts(searchQuery)
      setContacts(data)
    } catch (error: any) {
      toast({
        title: "Error loading contacts",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddContact() {
    if (!newEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      })
      return
    }

    try {
      const tags = newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      await createContact({
        email: newEmail,
        first_name: newFirstName || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      toast({
        title: "Contact added",
        description: `${newEmail} has been added to your contacts`,
      })

      setShowAddModal(false)
      setNewEmail("")
      setNewFirstName("")
      setNewTags("")
      await loadContacts()
    } catch (error: any) {
      toast({
        title: "Error adding contact",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleFileUpload(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await importContacts(formData)

      toast({
        title: "Import successful",
        description: `Imported ${result.inserted || 0}, updated ${result.updated || 0}, skipped ${result.skipped || 0}.`,
      })

      await loadContacts()
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)))
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  async function handleBulkAddTag() {
    if (!bulkTagInput.trim()) return

    try {
      await bulkAddTag(Array.from(selectedIds), bulkTagInput.trim())

      toast({
        title: "Tag added",
        description: `Added "${bulkTagInput}" to ${selectedIds.size} contact(s)`,
      })

      setShowBulkTagAdd(false)
      setBulkTagInput("")
      setSelectedIds(new Set())
      await loadContacts()
    } catch (error: any) {
      toast({
        title: "Error adding tag",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleBulkRemoveTag() {
    if (!bulkTagInput.trim()) return

    try {
      await bulkRemoveTag(Array.from(selectedIds), bulkTagInput.trim())

      toast({
        title: "Tag removed",
        description: `Removed "${bulkTagInput}" from ${selectedIds.size} contact(s)`,
      })

      setShowBulkTagRemove(false)
      setBulkTagInput("")
      setSelectedIds(new Set())
      await loadContacts()
    } catch (error: any) {
      toast({
        title: "Error removing tag",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleBulkUnsubscribe() {
    try {
      await bulkUnsubscribe(Array.from(selectedIds))

      toast({
        title: "Contacts unsubscribed",
        description: `${selectedIds.size} contact(s) have been unsubscribed`,
      })

      setSelectedIds(new Set())
      await loadContacts()
    } catch (error: any) {
      toast({
        title: "Error unsubscribing",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleBulkDelete() {
    try {
      await deleteContacts(Array.from(selectedIds))

      toast({
        title: "Contacts deleted",
        description: `${selectedIds.size} contact(s) have been deleted`,
      })

      setShowDeleteConfirm(false)
      setSelectedIds(new Set())
      await loadContacts()
    } catch (error: any) {
      toast({
        title: "Error deleting contacts",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  function openEditDrawer(contact: Contact) {
    setSelectedContact(contact)
    setEditFirstName(contact.first_name || "")
    setEditTags((contact.tags || []).join(", "))
    setEditUnsubscribed(!!contact.unsubscribed_at)
  }

  async function handleSaveContact() {
    if (!selectedContact) return

    setIsSavingContact(true)
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      await updateContact(selectedContact.id, {
        first_name: editFirstName || undefined,
        tags: tags.length > 0 ? tags : [],
        unsubscribed_at: editUnsubscribed ? new Date().toISOString() : null,
      })

      toast({
        title: "Contact updated",
        description: "Changes have been saved",
      })

      setSelectedContact(null)
      await loadContacts()
    } catch (error: any) {
      toast({
        title: "Error updating contact",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSavingContact(false)
    }
  }

  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < contacts.length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl">
        <PageHeader
          title="Contacts"
          description="Manage your email contacts and subscriber list"
          icon={Users}
          variant="gradient"
          action={
            <Button
              onClick={() => setShowAddModal(true)}
              size="lg"
              className="h-11 shadow-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          }
        />

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-blue-500">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                  <p className="text-3xl font-bold mt-2">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center ring-2 ring-blue-500/10">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-cyan-500">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold mt-2">{stats.active}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center ring-2 ring-cyan-500/10">
                  <UserCheck className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-orange-500">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unsubscribed</p>
                  <p className="text-3xl font-bold mt-2">{stats.unsubscribed}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center ring-2 ring-orange-500/10">
                  <UserMinus className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 bg-transparent">
                <Filter className="mr-2 h-4 w-4" />
                {statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active" : "Unsubscribed"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                <Users className="mr-2 h-4 w-4" />
                All Contacts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                <UserCheck className="mr-2 h-4 w-4" />
                Active Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("unsubscribed")}>
                <UserMinus className="mr-2 h-4 w-4" />
                Unsubscribed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed transition-all duration-200 hover:border-primary/50 hover:bg-accent/30 ${
            isDragging ? "border-primary bg-accent scale-[1.01] shadow-lg" : "border-border"
          }`}
        >
          <div className="p-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={`rounded-full p-4 transition-all duration-200 ${
                  isDragging
                    ? "bg-primary/20 scale-110"
                    : "bg-gradient-to-br from-primary/10 to-primary/5 hover:scale-105"
                }`}
              >
                {isImporting ? (
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                ) : (
                  <FileUp className="h-7 w-7 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold text-base mb-1">
                  {isImporting ? "Importing contacts..." : "Drop CSV file here to import"}
                </p>
                <p className="text-sm text-muted-foreground">or click the button below to browse</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                disabled={isImporting}
                className="hidden"
                id="csv-upload"
              />
              <Button variant="outline" size="lg" asChild disabled={isImporting} className="shadow-sm bg-transparent">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <FileUp className="mr-2 h-4 w-4" />
                  Select CSV File
                </label>
              </Button>
            </div>
          </div>
        </Card>

        {selectedIds.size > 0 && (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30 shadow-md">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Checkbox checked className="pointer-events-none" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""} selected
                    </p>
                    <p className="text-xs text-muted-foreground">Choose an action below</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowBulkTagAdd(true)} className="shadow-sm">
                    <Tag className="mr-2 h-3.5 w-3.5" />
                    Add Tag
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowBulkTagRemove(true)} className="shadow-sm">
                    <Tag className="mr-2 h-3.5 w-3.5" />
                    Remove Tag
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkUnsubscribe}
                    className="shadow-sm bg-transparent"
                  >
                    <UserX className="mr-2 h-3.5 w-3.5" />
                    Unsubscribe
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive hover:text-destructive shadow-sm"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-2">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="shadow-sm">
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-gradient-to-br from-primary/10 to-primary/5 p-6 mb-6">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {searchQuery || statusFilter !== "all" ? "No contacts found" : "No contacts yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "No contacts — import a CSV or add manually."}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowAddModal(true)}
                      size="lg"
                      className="shadow-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Contact
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-4 pl-1 pr-4 text-left">
                        <Checkbox
                          checked={allSelected}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = someSelected
                            }
                          }}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="pb-4 pr-6 text-left text-sm font-semibold text-muted-foreground">Email</th>
                      <th className="pb-4 pr-6 text-left text-sm font-semibold text-muted-foreground">First Name</th>
                      <th className="pb-4 pr-6 text-left text-sm font-semibold text-muted-foreground">Tags</th>
                      <th className="pb-4 pr-6 text-left text-sm font-semibold text-muted-foreground">Status</th>
                      <th className="pb-4 text-left text-sm font-semibold text-muted-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="border-b last:border-0 transition-colors hover:bg-accent/50 cursor-pointer group"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("input[type='checkbox']")) return
                          openEditDrawer(contact)
                        }}
                      >
                        <td className="py-4 pl-1 pr-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(contact.id)}
                            onCheckedChange={() => toggleSelect(contact.id)}
                          />
                        </td>
                        <td className="py-4 pr-6">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                              <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium text-sm">{contact.email}</span>
                          </div>
                        </td>
                        <td className="py-4 pr-6 text-sm text-muted-foreground">
                          {contact.first_name || <span className="italic">—</span>}
                        </td>
                        <td className="py-4 pr-6">
                          <div className="flex flex-wrap gap-1.5">
                            {contact.tags && contact.tags.length > 0 ? (
                              contact.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs font-medium">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground italic">No tags</span>
                            )}
                            {contact.tags && contact.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 pr-6">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                contact.unsubscribed_at ? "bg-red-500 animate-pulse" : "bg-green-500"
                              }`}
                            />
                            <span
                              className={`text-sm font-medium ${contact.unsubscribed_at ? "text-red-600" : "text-green-600"}`}
                            >
                              {contact.unsubscribed_at ? "Unsubscribed" : "Active"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : "—"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Add Contact Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-3 w-fit">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Add Contact</DialogTitle>
            <DialogDescription className="text-center">
              Add a new contact to your email list and start building your audience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">A valid email address is required</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium">
                First Name <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="first_name"
                placeholder="John"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Personalize your emails with their name</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium">
                Tags <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tags"
                  placeholder="customer, vip, newsletter"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <p className="text-xs text-muted-foreground">Separate multiple tags with commas</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 h-11">
              Cancel
            </Button>
            <Button
              onClick={handleAddContact}
              className="flex-1 h-11 shadow-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Tag Dialog */}
      <Dialog open={showBulkTagAdd} onOpenChange={setShowBulkTagAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>Add a tag to {selectedIds.size} selected contact(s)</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="bulk-tag-add">Tag name</Label>
            <Input
              id="bulk-tag-add"
              placeholder="vip"
              value={bulkTagInput}
              onChange={(e) => setBulkTagInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkTagAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAddTag}>Add Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Remove Tag Dialog */}
      <Dialog open={showBulkTagRemove} onOpenChange={setShowBulkTagRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Tag</DialogTitle>
            <DialogDescription>Remove a tag from {selectedIds.size} selected contact(s)</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="bulk-tag-remove">Tag name</Label>
            <Input
              id="bulk-tag-remove"
              placeholder="vip"
              value={bulkTagInput}
              onChange={(e) => setBulkTagInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkTagRemove(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkRemoveTag}>Remove Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contacts</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} contact(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Drawer */}
      <Sheet open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Contact Details</SheetTitle>
            <SheetDescription>View and edit contact information</SheetDescription>
          </SheetHeader>
          {selectedContact && (
            <div className="mt-6 space-y-6">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="mt-1.5 flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selectedContact.email}
                </div>
              </div>

              <div>
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  placeholder="John"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  placeholder="customer, vip, newsletter"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="edit-unsubscribed">Unsubscribed</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Toggle to unsubscribe this contact</p>
                </div>
                <Switch id="edit-unsubscribed" checked={editUnsubscribed} onCheckedChange={setEditUnsubscribed} />
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Engagement Stats
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Opens</p>
                    <p className="text-lg font-semibold">{selectedContact.opens_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-lg font-semibold">{selectedContact.clicks_count || 0}</p>
                  </div>
                </div>
              </div>

              {selectedContact.created_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Added {new Date(selectedContact.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button onClick={handleSaveContact} disabled={isSavingContact} className="w-full">
              {isSavingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
