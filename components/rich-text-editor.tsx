"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Undo,
  Redo,
  Paperclip,
  Image,
  X,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  url: string
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  attachments?: Attachment[]
  onAttachmentsChange?: (attachments: Attachment[]) => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image
  return FileText
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  attachments = [],
  onAttachmentsChange,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const inlineImageInputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkDisplayText, setLinkDisplayText] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [hasSelectedText, setHasSelectedText] = useState(false)
  const savedSelectionRef = useRef<Range | null>(null)

  // Track active formatting states
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    h1: false,
    h2: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    unorderedList: false,
    orderedList: false,
    code: false,
  })

  // Update active formatting states based on current selection
  const updateActiveFormats = useCallback(() => {
    try {
      // Get format block and normalize it (browsers return different formats like "h1", "H1", "<h1>")
      const formatBlock = document.queryCommandValue("formatBlock").toLowerCase().replace(/[<>]/g, "")

      // Check if we're inside a list by looking at the selection's parent elements
      const selection = window.getSelection()
      let inUnorderedList = false
      let inOrderedList = false

      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.anchorNode
        while (node && node !== editorRef.current) {
          if (node.nodeName === "UL") inUnorderedList = true
          if (node.nodeName === "OL") inOrderedList = true
          node = node.parentNode
        }
      }

      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        h1: formatBlock === "h1",
        h2: formatBlock === "h2",
        alignLeft: document.queryCommandState("justifyLeft"),
        alignCenter: document.queryCommandState("justifyCenter"),
        alignRight: document.queryCommandState("justifyRight"),
        unorderedList: inUnorderedList || document.queryCommandState("insertUnorderedList"),
        orderedList: inOrderedList || document.queryCommandState("insertOrderedList"),
        code: formatBlock === "pre",
      })
    } catch (e) {
      // Ignore errors if document commands not available
    }
  }, [])

  // Listen for selection changes to update formatting state
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current?.contains(document.activeElement) ||
          editorRef.current === document.activeElement) {
        updateActiveFormats()
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [updateActiveFormats])

  // Image resize state - using refs to avoid re-render issues during drag
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const resizeRef = useRef({
    isResizing: false,
    corner: "",
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    aspectRatio: 1,
  })

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  // Handle click on editor to select/deselect images
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    // Don't deselect if we're in the middle of resizing
    if (resizeRef.current.isResizing) return

    const target = e.target as HTMLElement
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement
      setSelectedImage(img)
      setImageSize({ width: img.offsetWidth, height: img.offsetHeight })
    } else {
      setSelectedImage(null)
    }
  }, [])

  // Prevent default drag behavior on images
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const preventDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement)?.tagName === "IMG") {
        e.preventDefault()
      }
    }

    editor.addEventListener("dragstart", preventDrag)
    return () => editor.removeEventListener("dragstart", preventDrag)
  }, [])

  // Handle click outside to deselect image
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resizeRef.current.isResizing) return
      const target = e.target as HTMLElement
      // Don't deselect if clicking on resize handles
      if (target.closest('[data-resize-handle]')) return
      if (selectedImage && editorRef.current && !editorRef.current.contains(target)) {
        setSelectedImage(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [selectedImage])

  // Resize handlers using document-level events for reliability
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!selectedImage) return

    const r = resizeRef.current
    r.isResizing = true
    r.corner = corner
    r.startX = e.clientX
    r.startY = e.clientY
    r.startWidth = selectedImage.offsetWidth
    r.startHeight = selectedImage.offsetHeight
    r.aspectRatio = r.startWidth / r.startHeight

    const handleMouseMove = (e: MouseEvent) => {
      if (!r.isResizing || !selectedImage) return

      const deltaX = e.clientX - r.startX
      const deltaY = e.clientY - r.startY

      let newWidth = r.startWidth
      let newHeight = r.startHeight

      // Calculate new dimensions based on corner being dragged
      if (r.corner.includes("e")) newWidth = Math.max(50, r.startWidth + deltaX)
      if (r.corner.includes("w")) newWidth = Math.max(50, r.startWidth - deltaX)
      if (r.corner.includes("s")) newHeight = Math.max(50, r.startHeight + deltaY)
      if (r.corner.includes("n")) newHeight = Math.max(50, r.startHeight - deltaY)

      // Maintain aspect ratio for corner handles
      if (r.corner.length === 2) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / r.aspectRatio
        } else {
          newWidth = newHeight * r.aspectRatio
        }
      }

      selectedImage.style.width = `${Math.round(newWidth)}px`
      selectedImage.style.height = `${Math.round(newHeight)}px`
      setImageSize({ width: Math.round(newWidth), height: Math.round(newHeight) })
    }

    const handleMouseUp = () => {
      r.isResizing = false
      r.corner = ""
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      // Save changes to content
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [selectedImage, onChange])

  // Delete selected image
  const deleteSelectedImage = useCallback(() => {
    if (selectedImage) {
      selectedImage.remove()
      setSelectedImage(null)
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }
  }, [selectedImage, onChange])

  // Get image position for resize handles
  const getImagePosition = useCallback(() => {
    if (!selectedImage || !editorRef.current) return null
    const editorRect = editorRef.current.getBoundingClientRect()
    const imageRect = selectedImage.getBoundingClientRect()
    return {
      top: imageRect.top - editorRect.top,
      left: imageRect.left - editorRect.left,
      width: imageRect.width,
      height: imageRect.height,
    }
  }, [selectedImage])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command: string, value?: string) => {
    // Handle toggle behavior for formatBlock commands (headings, code)
    if (command === "formatBlock" && value) {
      const currentFormat = document.queryCommandValue("formatBlock").toLowerCase().replace(/[<>]/g, "")
      const targetFormat = value.toLowerCase().replace(/[<>]/g, "")

      // If already in this format, toggle back to paragraph
      if (currentFormat === targetFormat) {
        document.execCommand("formatBlock", false, "<p>")
      } else {
        document.execCommand(command, false, value)
      }
    } else {
      document.execCommand(command, false, value)
    }
    editorRef.current?.focus()
    handleInput()
    updateActiveFormats()
  }

  const insertLink = () => {
    // Save current selection before opening dialog
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
    }

    const selectedText = selection?.toString().trim() || ""
    setHasSelectedText(!!selectedText)
    setLinkDisplayText(selectedText)
    setLinkUrl("")
    setLinkDialogOpen(true)
  }

  const handleInsertLink = () => {
    if (!linkUrl) return

    // Ensure URL has protocol
    const finalUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') ? linkUrl : `https://${linkUrl}`

    editorRef.current?.focus()

    // Restore saved selection
    if (savedSelectionRef.current) {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(savedSelectionRef.current)
    }

    if (hasSelectedText && linkDisplayText) {
      // If text was selected, wrap it with link
      execCommand("createLink", finalUrl)
    } else {
      // Insert new link with display text
      const displayText = linkDisplayText || linkUrl
      const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${displayText}</a>`
      document.execCommand("insertHTML", false, linkHtml)
      handleInput()
    }

    setLinkDialogOpen(false)
    setLinkDisplayText("")
    setLinkUrl("")
  }

  const insertVariable = (variable: string) => {
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      const node = document.createTextNode(variable)
      range.insertNode(node)
      range.setStartAfter(node)
      range.setEndAfter(node)
      selection.removeAllRanges()
      selection.addRange(range)
      handleInput()
    }
  }

  // Insert logo as an actual image tag with variable src
  const insertLogoImage = async () => {
    // First check if brand_logo_url is set in settings
    try {
      const response = await fetch('/api/settings')
      const settings = await response.json()

      if (!settings.brand_logo_url) {
        toast({
          title: "Logo URL Not Set",
          description: "Please set your Brand Logo URL in Settings → Defaults tab first.",
          variant: "destructive",
        })
        return
      }

      editorRef.current?.focus()
      // Use the actual URL for preview in editor, but template variable for sending
      const logoHtml = `<img src="${settings.brand_logo_url}" alt="Logo" data-variable="brand_logo_url" style="max-width: 200px; height: auto;" />`
      document.execCommand("insertHTML", false, logoHtml)
      handleInput()

      toast({
        title: "Logo Inserted",
        description: "The logo will be displayed in your email.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not verify logo URL. Please check your settings.",
        variant: "destructive",
      })
    }
  }

  // Insert inline image into the editor content
  const insertInlineImage = (url: string, alt: string = "image") => {
    editorRef.current?.focus()
    const img = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`
    document.execCommand("insertHTML", false, img)
    handleInput()
  }

  // Allowed image types for inline images (SVG not supported by most email clients)
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

  // Handle inline image upload (embeds in body, not as attachment)
  const handleInlineImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          if (file.type === "image/svg+xml") {
            toast({
              title: "Unsupported Format",
              description: "SVG images are not supported in emails as most email clients cannot display them. Please use JPG, PNG, GIF, or WebP instead.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Unsupported Format",
              description: `File "${file.name}" is not a supported image format. Allowed: JPG, PNG, GIF, WebP.`,
              variant: "destructive",
            })
          }
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: `File "${file.name}" is too large. Maximum size is 10MB.`,
            variant: "destructive",
          })
          continue
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/attachments/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Upload failed")
        }

        const result = await response.json()
        // Insert the image inline in the editor
        insertInlineImage(result.url, file.name)
      }
    } catch (error: any) {
      console.error("Inline image upload error:", error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = ""
    }
  }

  // Handle paste event to embed images inline
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()

        // Check for supported formats
        if (!ALLOWED_IMAGE_TYPES.includes(item.type)) {
          if (item.type === "image/svg+xml") {
            toast({
              title: "Unsupported Format",
              description: "SVG images are not supported in emails as most email clients cannot display them. Please use JPG, PNG, GIF, or WebP instead.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Unsupported Format",
              description: "Unsupported image format. Please use JPG, PNG, GIF, or WebP.",
              variant: "destructive",
            })
          }
          break
        }

        const file = item.getAsFile()
        if (file) {
          setIsUploading(true)
          try {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("/api/attachments/upload", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.message || "Upload failed")
            }

            const result = await response.json()
            insertInlineImage(result.url, "pasted-image")
          } catch (error: any) {
            console.error("Paste image upload error:", error)
            toast({
              title: "Upload Failed",
              description: error.message || "Failed to upload pasted image",
              variant: "destructive",
            })
          } finally {
            setIsUploading(false)
          }
        }
        break // Only handle first image
      }
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onAttachmentsChange) return

    setIsUploading(true)
    const newAttachments: Attachment[] = []

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: `File "${file.name}" is too large. Maximum size is 10MB.`,
            variant: "destructive",
          })
          continue
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/attachments/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Upload failed")
        }

        const result = await response.json()
        newAttachments.push({
          id: result.id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: result.url,
        })
      }

      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments])
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (imageInputRef.current) imageInputRef.current.value = ""
    }
  }

  const removeAttachment = (id: string) => {
    if (onAttachmentsChange) {
      onAttachmentsChange(attachments.filter((a) => a.id !== id))
    }
  }

  const ToolbarButton = ({
    icon: Icon,
    onClick,
    title,
    disabled,
    isActive,
  }: {
    icon: any
    onClick: () => void
    title: string
    disabled?: boolean
    isActive?: boolean
  }) => (
    <Button
      type="button"
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      disabled={disabled}
      className={cn(
        "h-8 w-8 p-0",
        isActive
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )

  return (
    <div
      className={cn(
        "border rounded-md overflow-hidden transition-all",
        isFocused && "ring-2 ring-ring ring-offset-2",
        className
      )}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      {/* Inline image input - images go into body, not attachments (no SVG - not supported by email clients) */}
      <input
        ref={inlineImageInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
        multiple
        onChange={(e) => handleInlineImageUpload(e.target.files)}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        <ToolbarButton icon={Undo} onClick={() => execCommand("undo")} title="Undo" />
        <ToolbarButton icon={Redo} onClick={() => execCommand("redo")} title="Redo" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={Bold} onClick={() => execCommand("bold")} title="Bold (Ctrl+B)" isActive={activeFormats.bold} />
        <ToolbarButton icon={Italic} onClick={() => execCommand("italic")} title="Italic (Ctrl+I)" isActive={activeFormats.italic} />
        <ToolbarButton icon={Underline} onClick={() => execCommand("underline")} title="Underline (Ctrl+U)" isActive={activeFormats.underline} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={Heading1} onClick={() => execCommand("formatBlock", "<h1>")} title="Heading 1" isActive={activeFormats.h1} />
        <ToolbarButton icon={Heading2} onClick={() => execCommand("formatBlock", "<h2>")} title="Heading 2" isActive={activeFormats.h2} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={AlignLeft} onClick={() => execCommand("justifyLeft")} title="Align Left" isActive={activeFormats.alignLeft} />
        <ToolbarButton icon={AlignCenter} onClick={() => execCommand("justifyCenter")} title="Align Center" isActive={activeFormats.alignCenter} />
        <ToolbarButton icon={AlignRight} onClick={() => execCommand("justifyRight")} title="Align Right" isActive={activeFormats.alignRight} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={List} onClick={() => execCommand("insertUnorderedList")} title="Bullet List" isActive={activeFormats.unorderedList} />
        <ToolbarButton icon={ListOrdered} onClick={() => execCommand("insertOrderedList")} title="Numbered List" isActive={activeFormats.orderedList} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={LinkIcon} onClick={insertLink} title="Insert Link" />
        <ToolbarButton icon={Code} onClick={() => execCommand("formatBlock", "<pre>")} title="Code Block" isActive={activeFormats.code} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Image Button - Inserts inline in body */}
        <ToolbarButton
          icon={isUploading ? Loader2 : Image}
          onClick={() => inlineImageInputRef.current?.click()}
          title="Insert Image (inline in body)"
          disabled={isUploading}
        />

        {/* Attachment Button - For documents only */}
        {onAttachmentsChange && (
          <>
            <ToolbarButton
              icon={isUploading ? Loader2 : Paperclip}
              onClick={() => fileInputRef.current?.click()}
              title="Attach Document"
              disabled={isUploading}
            />
            <Separator orientation="vertical" className="h-6 mx-1" />
          </>
        )}

        {/* Variable Buttons */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            insertVariable("{{first_name}}")
          }}
          className="h-8 text-xs font-mono"
        >
          + first_name
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            insertVariable("{{email}}")
          }}
          className="h-8 text-xs font-mono"
        >
          + email
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            insertVariable("{{book_link}}")
          }}
          className="h-8 text-xs font-mono"
        >
          + book_link
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            insertVariable("{{discount_code}}")
          }}
          className="h-8 text-xs font-mono"
        >
          + discount_code
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault()
            insertLogoImage()
          }}
          className="h-8 text-xs font-mono"
        >
          + logo
        </Button>
      </div>

      {/* Editor */}
      <div className="relative overflow-visible">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onClick={(e) => {
            // Ctrl+Click or Cmd+Click on a link opens it in new tab
            const target = e.target as HTMLElement
            if (target.tagName === 'A' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              const href = target.getAttribute('href')
              if (href) {
                window.open(href, '_blank', 'noopener,noreferrer')
              }
              return
            }
            handleEditorClick(e)
            updateActiveFormats()
          }}
          onKeyUp={updateActiveFormats}
          onFocus={() => {
            setIsFocused(true)
            updateActiveFormats()
          }}
          onBlur={() => setIsFocused(false)}
          className="min-h-[300px] p-4 pt-6 pb-6 max-w-none focus:outline-none rich-text-editor-content"
          style={{
            lineHeight: "1.6",
            fontFamily: "inherit",
          }}
          data-placeholder={placeholder}
        />

        {/* Image Resize Handles */}
        {selectedImage && !isUploading && (() => {
          const pos = getImagePosition()
          if (!pos) return null
          return (
            <div
              className="absolute pointer-events-none"
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                height: pos.height,
              }}
            >
              {/* Selection border */}
              <div className="absolute inset-0 border-2 border-primary rounded" />

              {/* Corner handles */}
              {["nw", "ne", "sw", "se"].map((corner) => (
                <div
                  key={corner}
                  data-resize-handle
                  className="absolute w-4 h-4 bg-primary border-2 border-background rounded-sm pointer-events-auto hover:scale-125 transition-transform shadow-sm"
                  style={{
                    top: corner.includes("n") ? -8 : "auto",
                    bottom: corner.includes("s") ? -8 : "auto",
                    left: corner.includes("w") ? -8 : "auto",
                    right: corner.includes("e") ? -8 : "auto",
                    cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                  }}
                  onMouseDown={(e) => handleResizeMouseDown(e, corner)}
                />
              ))}

              {/* Edge handles */}
              {["n", "s", "e", "w"].map((edge) => (
                <div
                  key={edge}
                  data-resize-handle
                  className="absolute bg-primary border-2 border-background rounded-sm pointer-events-auto hover:scale-125 transition-transform shadow-sm"
                  style={{
                    width: edge === "n" || edge === "s" ? 28 : 8,
                    height: edge === "e" || edge === "w" ? 28 : 8,
                    top: edge === "n" ? -5 : edge === "s" ? "auto" : "50%",
                    bottom: edge === "s" ? -5 : "auto",
                    left: edge === "w" ? -5 : edge === "e" ? "auto" : "50%",
                    right: edge === "e" ? -5 : "auto",
                    transform: (edge === "n" || edge === "s") ? "translateX(-50%)" : (edge === "e" || edge === "w") ? "translateY(-50%)" : "none",
                    cursor: edge === "n" || edge === "s" ? "ns-resize" : "ew-resize",
                  }}
                  onMouseDown={(e) => handleResizeMouseDown(e, edge)}
                />
              ))}

              {/* Delete button */}
              <button
                type="button"
                data-resize-handle
                className="absolute -top-10 left-1/2 -translate-x-1/2 p-1.5 bg-destructive text-destructive-foreground rounded-md shadow-lg pointer-events-auto hover:bg-destructive/90 transition-colors"
                onClick={deleteSelectedImage}
                title="Delete image"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Size indicator */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg pointer-events-none whitespace-nowrap border">
                {imageSize.width} × {imageSize.height}
              </div>
            </div>
          )
        })()}

        {/* Upload Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-card border shadow-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium">Uploading...</p>
                <p className="text-xs text-muted-foreground">Please wait while your file is being uploaded</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="border-t bg-muted/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Attachments ({attachments.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.type)
              return (
                <Badge
                  key={attachment.id}
                  variant="secondary"
                  className="flex items-center gap-2 py-1.5 px-3 text-sm"
                >
                  <FileIcon className="h-4 w-4" />
                  <span className="max-w-[150px] truncate">{attachment.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(attachment.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        [contenteditable] ul {
          list-style-type: disc;
          padding-left: 2rem;
          margin: 1rem 0;
        }
        [contenteditable] ol {
          list-style-type: decimal;
          padding-left: 2rem;
          margin: 1rem 0;
        }
        [contenteditable] li {
          margin: 0.5rem 0;
        }
        [contenteditable] h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1rem 0;
        }
        [contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1rem 0;
        }
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        [contenteditable] pre {
          background: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          margin: 1rem 0;
          font-family: monospace;
        }
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
          background-color: rgba(59, 130, 246, 0.1);
          padding: 0 2px;
          border-radius: 2px;
        }
        [contenteditable] a:hover {
          background-color: rgba(59, 130, 246, 0.2);
        }
        [contenteditable] strong {
          font-weight: bold;
        }
        [contenteditable] em {
          font-style: italic;
        }
        [contenteditable] u {
          text-decoration: underline;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
          cursor: pointer;
          transition: opacity 0.15s;
          user-select: none;
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
        }
        [contenteditable] img:hover {
          opacity: 0.9;
        }
        [contenteditable] img::selection {
          background: transparent;
        }
      `}</style>

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>

      {/* Link Insert Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!hasSelectedText && (
              <div className="space-y-2">
                <Label htmlFor="link-text">Display Text</Label>
                <Input
                  id="link-text"
                  placeholder="e.g., Click here, My Website"
                  value={linkDisplayText}
                  onChange={(e) => setLinkDisplayText(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="e.g., https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleInsertLink()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertLink} disabled={!linkUrl}>
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
