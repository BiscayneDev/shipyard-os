"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { Repo } from "@/app/api/projects/route"

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Solidity: "#AA6746",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Ruby: "#701516",
}

const PINNED = ["shipyard", "mission-control", "superteam-miami", "arken"]

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

function CIBadge({ run }: { run: Repo["latestRun"] }) {
  if (!run) return null

  const isRunning = run.status === "in_progress" || run.status === "queued"
  const isPassing = run.conclusion === "success"
  const isFailing =
    run.conclusion === "failure" || run.conclusion === "timed_out" || run.conclusion === "cancelled"

  if (isRunning) {
    return (
      <a
        href={run.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: "#f59e0b" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: "#f59e0b" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: "#f59e0b" }}
          />
        </span>
        Running
      </a>
    )
  }

  if (isPassing) {
    return (
      <a
        href={run.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: "#22c55e" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="w-2 h-2 rounded-full inline-block"
          style={{ backgroundColor: "#22c55e" }}
        />
        CI passing
      </a>
    )
  }

  if (isFailing) {
    return (
      <a
        href={run.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: "#ef4444" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="w-2 h-2 rounded-full inline-block"
          style={{ backgroundColor: "#ef4444" }}
        />
        CI failing
      </a>
    )
  }

  return null
}

function RepoCard({ repo, isPinned }: { repo: Repo; isPinned: boolean }) {
  const lang = repo.primaryLanguage?.name
  const langColor = lang ? LANGUAGE_COLORS[lang] || "#71717a" : null

  return (
    <div
      className="rounded-xl border p-5 space-y-3 transition-all hover:border-[rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]"
      style={{
        backgroundColor: "#111118",
        borderColor: isPinned ? "rgba(124, 58, 237, 0.25)" : "#1a1a2e",
      }}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href={`/projects/${repo.name}`} className="text-sm font-bold text-white hover:text-violet-200">
              {repo.name}
            </Link>
            {isPinned && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ backgroundColor: "rgba(124, 58, 237, 0.15)", color: "#a78bfa" }}
              >
                PINNED
              </span>
            )}
          </div>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-white"
          >
            GitHub ↗
          </a>
        </div>
        <p className="text-xs text-zinc-500 line-clamp-2">
          {repo.description || "No description"}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {repo.openPRs.length > 0 && (
          <a
            href={`${repo.url}/pulls`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              color: "#f59e0b",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            {repo.openPRs.length} PR{repo.openPRs.length > 1 ? "s" : ""}
          </a>
        )}
        <CIBadge run={repo.latestRun} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {lang && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: langColor || undefined }}
              />
              <span className="text-xs text-zinc-400">{lang}</span>
            </div>
          )}
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: repo.isPrivate
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(34, 197, 94, 0.15)",
              color: repo.isPrivate ? "#ef4444" : "#22c55e",
            }}
          >
            {repo.isPrivate ? "Private" : "Public"}
          </span>
        </div>

        <span className="text-xs text-zinc-600">{relativeTime(repo.updatedAt)}</span>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("/api/projects")
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }

        const data = await res.json()
        if (Array.isArray(data)) {
          setRepos(data)
        } else {
          throw new Error("Invalid projects response")
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchRepos()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Loading projects...</p>
      </div>
    )
  }

  const pinnedRepos = repos.filter((r) => PINNED.includes(r.name))
  const otherRepos = repos.filter((r) => !PINNED.includes(r.name))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-sm text-zinc-500">BiscayneDev on GitHub</p>
        </div>
        <a
          href="https://github.com/BiscayneDev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium transition-colors hover:text-white"
          style={{ color: "#7c3aed" }}
        >
          Open GitHub &rarr;
        </a>
      </div>

      {error ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <p className="text-zinc-500 text-sm">
            Could not load repositories right now. Please try again in a moment.
          </p>
        </div>
      ) : (
        <>
          {repos.length === 0 && (
            <div
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
            >
              <p className="text-zinc-500 text-sm">No repositories found yet.</p>
            </div>
          )}

          {/* Pinned projects */}
          {pinnedRepos.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">
                Pinned Projects
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedRepos.map((repo) => (
                  <RepoCard key={repo.name} repo={repo} isPinned={true} />
                ))}
              </div>
            </div>
          )}

          {/* All other repos */}
          {otherRepos.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-600">
                All Repos
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherRepos.map((repo) => (
                  <RepoCard key={repo.name} repo={repo} isPinned={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
