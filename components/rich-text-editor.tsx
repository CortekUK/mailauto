"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)

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

  const ToolbarButton = ({
    icon: Icon,
    onClick,
    title,
  }: {
    icon: any
    onClick: () => void
    title: string
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onMouseDown={(e) => {
        e.preventDefault() // Prevent button from taking focus
        onClick()
      }}
      title={title}
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
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="min-h-[300px] p-4 max-w-none focus:outline-none"
        style={{
          lineHeight: "1.6",
          fontFamily: "inherit",
        }}
        data-placeholder={placeholder}
      />

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
