"use client";

import { useRef, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2, Heading3, Quote, Undo, Redo, Type
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const ToolbarButton = ({
  icon: Icon,
  onClick,
  active = false,
  title,
}: {
  icon: React.ElementType;
  onClick: () => void;
  active?: boolean;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-md transition-colors ${
      active
        ? "bg-bdja-primary text-white"
        : "text-gray-600 hover:bg-gray-100 hover:text-bdja-primary"
    }`}
  >
    <Icon className="w-4 h-4" />
  </button>
);

export function RichTextEditor({ value, onChange, placeholder, className = "" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((command: string, valueArg: string = "") => {
    document.execCommand(command, false, valueArg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = prompt("Enter URL:");
    if (url) exec("createLink", url);
  }, [exec]);

  const insertImage = useCallback(() => {
    const url = prompt("Enter image URL:");
    if (url) exec("insertImage", url);
  }, [exec]);

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Undo} onClick={() => exec("undo")} title="Undo" />
          <ToolbarButton icon={Redo} onClick={() => exec("redo")} title="Redo" />
        </div>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Heading1} onClick={() => exec("formatBlock", "H1")} title="Heading 1" />
          <ToolbarButton icon={Heading2} onClick={() => exec("formatBlock", "H2")} title="Heading 2" />
          <ToolbarButton icon={Heading3} onClick={() => exec("formatBlock", "H3")} title="Heading 3" />
        </div>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Bold} onClick={() => exec("bold")} title="Bold" />
          <ToolbarButton icon={Italic} onClick={() => exec("italic")} title="Italic" />
          <ToolbarButton icon={Underline} onClick={() => exec("underline")} title="Underline" />
          <ToolbarButton icon={Strikethrough} onClick={() => exec("strikeThrough")} title="Strikethrough" />
        </div>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={AlignLeft} onClick={() => exec("justifyLeft")} title="Align Left" />
          <ToolbarButton icon={AlignCenter} onClick={() => exec("justifyCenter")} title="Align Center" />
          <ToolbarButton icon={AlignRight} onClick={() => exec("justifyRight")} title="Align Right" />
        </div>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={List} onClick={() => exec("insertUnorderedList")} title="Bullet List" />
          <ToolbarButton icon={ListOrdered} onClick={() => exec("insertOrderedList")} title="Numbered List" />
          <ToolbarButton icon={Quote} onClick={() => exec("formatBlock", "BLOCKQUOTE")} title="Quote" />
        </div>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={LinkIcon} onClick={insertLink} title="Insert Link" />
          <ToolbarButton icon={ImageIcon} onClick={insertImage} title="Insert Image" />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[300px] p-4 text-sm leading-relaxed text-gray-700 focus:outline-none prose prose-sm max-w-none"
        style={{ minHeight: 300 }}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
