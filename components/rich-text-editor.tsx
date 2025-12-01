"use client"

import { useEffect, useRef, useState } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const insertLink = () => {
    const url = prompt("Enter URL:")
    if (url) {
      execCommand("createLink", url)
    }
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

  // Insert inline image into the editor content
  const insertInlineImage = (url: string, alt: string = "image") => {
    editorRef.current?.focus()
    const img = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`
    document.execCommand("insertHTML", false, img)
    handleInput()
  }

  // Handle inline image upload (embeds in body, not as attachment)
  const handleInlineImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          alert(`File "${file.name}" is not an image.`)
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          alert(`File "${file.name}" is too large. Maximum size is 10MB.`)
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
      alert(error.message || "Failed to upload image")
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
            alert(error.message || "Failed to upload pasted image")
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
          alert(`File "${file.name}" is too large. Maximum size is 10MB.`)
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
      alert(error.message || "Failed to upload file")
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
  }: {
    icon: any
    onClick: () => void
    title: string
    disabled?: boolean
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      disabled={disabled}
      className="h-8 w-8 p-0 hover:bg-accent"
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
      {/* Inline image input - images go into body, not attachments */}
      <input
        ref={inlineImageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => handleInlineImageUpload(e.target.files)}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        <ToolbarButton icon={Undo} onClick={() => execCommand("undo")} title="Undo" />
        <ToolbarButton icon={Redo} onClick={() => execCommand("redo")} title="Redo" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={Bold} onClick={() => execCommand("bold")} title="Bold (Ctrl+B)" />
        <ToolbarButton icon={Italic} onClick={() => execCommand("italic")} title="Italic (Ctrl+I)" />
        <ToolbarButton icon={Underline} onClick={() => execCommand("underline")} title="Underline (Ctrl+U)" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={Heading1} onClick={() => execCommand("formatBlock", "<h1>")} title="Heading 1" />
        <ToolbarButton icon={Heading2} onClick={() => execCommand("formatBlock", "<h2>")} title="Heading 2" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={AlignLeft} onClick={() => execCommand("justifyLeft")} title="Align Left" />
        <ToolbarButton icon={AlignCenter} onClick={() => execCommand("justifyCenter")} title="Align Center" />
        <ToolbarButton icon={AlignRight} onClick={() => execCommand("justifyRight")} title="Align Right" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={List} onClick={() => execCommand("insertUnorderedList")} title="Bullet List" />
        <ToolbarButton icon={ListOrdered} onClick={() => execCommand("insertOrderedList")} title="Numbered List" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={LinkIcon} onClick={insertLink} title="Insert Link" />
        <ToolbarButton icon={Code} onClick={() => execCommand("formatBlock", "<pre>")} title="Code Block" />

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
            insertVariable("{{name}}")
          }}
          className="h-8 text-xs font-mono"
        >
          + name
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
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="min-h-[300px] p-4 max-w-none focus:outline-none"
        style={{
          lineHeight: "1.6",
          fontFamily: "inherit",
        }}
        data-placeholder={placeholder}
      />

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
          color: hsl(var(--primary));
          text-decoration: underline;
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
        }
      `}</style>

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
