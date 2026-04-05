"use client"

import { useState } from "react"

interface AddSkillModalProps {
  onClose: () => void
  onAdded: () => void
}

const CATEGORIES = [
  "research",
  "engineering",
  "crypto",
  "communication",
  "productivity",
  "ai",
  "other",
]

export default function AddSkillModal({ onClose, onAdded }: AddSkillModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [sourceUrl, setSourceUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !description.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/agents/skills/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          source_url: sourceUrl.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to add skill")
        return
      }

      onAdded()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 space-y-5"
        style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add External Skill</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl leading-none"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-skill"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600"
              style={{ backgroundColor: "#0a0a0f", border: "1px solid #27272a" }}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What this skill does"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600"
              style={{ backgroundColor: "#0a0a0f", border: "1px solid #27272a" }}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white"
              style={{ backgroundColor: "#0a0a0f", border: "1px solid #27272a" }}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Source URL <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600"
              style={{ backgroundColor: "#0a0a0f", border: "1px solid #27272a" }}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 transition-colors"
              style={{ backgroundColor: "#1a1a2e" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !description.trim()}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-black transition-opacity"
              style={{
                backgroundColor: "#06b6d4",
                opacity: submitting || !name.trim() || !description.trim() ? 0.4 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Adding..." : "Add Skill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
