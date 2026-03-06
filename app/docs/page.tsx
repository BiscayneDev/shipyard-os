"use client"

import { useEffect, useState, useCallback } from "react"
import { Search } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface DocEntry {
  id: string
  title: string
  source: "scout-reports" | "research" | "agent-docs" | "memory"
  sourceLabel: string
  preview: string
  updatedAt: string
  content?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const SOURCE_ORDER: DocEntry["source"][] = ["memory", "scout-reports", "research", "agent-docs"]

const SOURCE_ICONS: Record<DocEntry["source"], string> = {
  memory: "🧠",
  "scout-reports": "🔭",
  research: "📊",
  "agent-docs": "📋",
}

const SOURCE_COLORS: Record<DocEntry["source"], string> = {
  memory: "#06b6d4",
  "scout-reports": "#06b6d4",
  research: "#ec4899",
  "agent-docs": "#10b981",
}

// ── Simple Markdown Renderer ───────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []

  lines.forEach((line, i) => {
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-semibold text-white mt-5 mb-2 first:mt-0" style={{ color: "#06b6d4" }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-zinc-300 mt-4 mb-1.5">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2 text-sm text-zinc-400 leading-relaxed">
          <span className="text-zinc-600 shrink-0 mt-0.5">•</span>
          <span>{line.slice(2)}</span>
        </div>
      )
    } else if (line.startsWith("```")) {
      elements.push(
        <div key={i} className="text-[11px] font-mono text-zinc-500 border-b border-zinc-800/40" />
      )
    } else if (line.startsWith("|")) {
      elements.push(
        <p key={i} className="text-xs font-mono text-zinc-500 leading-relaxed">{line}</p>
      )
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={i} className="text-sm font-semibold text-zinc-200">{line.replace(/\*\*/g, "")}</p>
      )
    } else {
      // Inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      elements.push(
        <p key={i} className="text-sm text-zinc-400 leading-relaxed">
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="text-zinc-200 font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      )
    }
  })

  return <div className="space-y-0.5">{elements}</div>
}

// ── Docs Page ─────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [docs, setDocs] = useState<DocEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedContent, setSelectedContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((d: DocEntry[]) => {
        const list = Array.isArray(d) ? d : []
        setDocs(list)
        setLoading(false)
        if (list.length > 0) {
          setSelectedId(list[0].id)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  const loadContent = useCallback(async (id: string) => {
    setContentLoading(true)
    try {
      const res = await fetch(`/api/docs?id=${encodeURIComponent(id)}`)
      const d = await res.json() as DocEntry
      setSelectedContent(d.content ?? "")
    } catch {
      setSelectedContent("Failed to load document.")
    }
    setContentLoading(false)
  }, [])

  useEffect(() => {
    if (selectedId) loadContent(selectedId)
  }, [selectedId, loadContent])

  const grouped = SOURCE_ORDER.reduce<Record<string, DocEntry[]>>((acc, source) => {
    const group = docs.filter((d) => d.source === source)
    if (group.length > 0) acc[source] = group
    return acc
  }, {})

  const searchLower = search.toLowerCase()
  const filteredGroups = Object.entries(grouped).reduce<Record<string, DocEntry[]>>((acc, [source, group]) => {
    const filtered = group.filter(
      (d) =>
        d.title.toLowerCase().includes(searchLower) ||
        d.preview.toLowerCase().includes(searchLower)
    )
    if (filtered.length > 0) acc[source] = filtered
    return acc
  }, {})

  const selectedDoc = docs.find((d) => d.id === selectedId)

  return (
    <div className="flex gap-4 h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <div
        className="w-64 shrink-0 rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
      >
        <div className="p-3 border-b border-zinc-800/40">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}
          >
            <Search size={12} style={{ color: "#52525b" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs..."
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-600 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#27272a transparent" }}>
          {loading ? (
            <div className="p-4 text-center text-xs text-zinc-600">Loading...</div>
          ) : Object.keys(filteredGroups).length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-600">No docs found</div>
          ) : (
            Object.entries(filteredGroups).map(([source, group]) => {
              const src = source as DocEntry["source"]
              return (
                <div key={source} className="mb-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                    <span className="text-xs">{SOURCE_ICONS[src]}</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: SOURCE_COLORS[src] }}>
                      {group[0].sourceLabel}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {group.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedId(doc.id)}
                        className="w-full text-left px-2 py-2 rounded-lg text-xs transition-colors"
                        style={
                          selectedId === doc.id
                            ? { backgroundColor: `${SOURCE_COLORS[src]}15`, color: "#fff" }
                            : { color: "#a1a1aa" }
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          {doc.id === "memory" && (
                            <span className="text-[10px] px-1 rounded font-mono shrink-0" style={{ backgroundColor: `${SOURCE_COLORS[src]}20`, color: SOURCE_COLORS[src] }}>
                              pinned
                            </span>
                          )}
                          <span className="truncate font-medium">{doc.title}</span>
                        </div>
                        <p className="text-[10px] text-zinc-700 mt-0.5">{relativeTime(doc.updatedAt)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Content Panel */}
      <div
        className="flex-1 rounded-xl overflow-hidden flex flex-col min-w-0"
        style={{ backgroundColor: "#111118", border: "1px solid rgba(6,182,212,0.15)" }}
      >
        {!selectedDoc ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-4xl">📋</p>
              <p className="text-sm text-zinc-500">Select a document</p>
            </div>
          </div>
        ) : (
          <>
            <div
              className="px-6 py-4 border-b border-zinc-800/40 flex items-center gap-3 shrink-0"
            >
              <span className="text-xl">{SOURCE_ICONS[selectedDoc.source]}</span>
              <div>
                <h2 className="text-sm font-semibold text-white">{selectedDoc.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono uppercase" style={{ color: SOURCE_COLORS[selectedDoc.source] }}>
                    {selectedDoc.sourceLabel}
                  </span>
                  <span className="text-[10px] text-zinc-600">•</span>
                  <span className="text-[10px] text-zinc-600">
                    Updated {relativeTime(selectedDoc.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto px-6 py-5"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#27272a transparent" }}
            >
              {contentLoading ? (
                <div className="text-center py-8 text-xs text-zinc-600">Loading...</div>
              ) : selectedContent ? (
                <MarkdownContent content={selectedContent} />
              ) : (
                <p className="text-xs text-zinc-600 text-center py-8">No content available</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
