"use client"

import { useEffect, useState } from "react"

interface ModelStats {
  model: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
}

interface DailyCost {
  date: string
  costUSD: number
}

interface CostsData {
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheCreationTokens: number
  totalCacheReadTokens: number
  totalTokens: number
  totalCostUSD: number
  byModel: ModelStats[]
  dailyCosts: DailyCost[]
  dataSource: string
  lastUpdated: string | null
  error?: string
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtCost(n: number): string {
  if (n < 0.01) return "<$0.01"
  return `$${n.toFixed(2)}`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const AMBER = "#f59e0b"

export default function CostsPage() {
  const [data, setData] = useState<CostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/costs")
      .then((r) => r.json())
      .then((d: CostsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const noAdminKey = data?.error === "no_admin_key"
  const isEmpty =
    !data ||
    (!noAdminKey && data.totalTokens === 0 && data.byModel.length === 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="text-3xl font-bold text-white">Costs</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Token usage &amp; spend across all models
            {data?.lastUpdated && (
              <span className="ml-2 text-zinc-600">· {timeAgo(data.lastUpdated)}</span>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-zinc-600">Loading usage data...</p>
        </div>
      ) : noAdminKey ? (
        /* ── No Admin Key empty state ──────────────────────────────────── */
        <div
          className="rounded-xl p-10 text-center space-y-4"
          style={{ backgroundColor: "#111118", border: `1px solid ${AMBER}30` }}
        >
          <p className="text-3xl">🔑</p>
          <p className="text-xl font-semibold text-white">Connect Anthropic</p>
          <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Add your Anthropic Admin API key to see real cost and usage data.
          </p>
          <div
            className="rounded-lg p-4 text-left mx-auto max-w-sm"
            style={{
              backgroundColor: "#0d0d17",
              border: "1px solid #2a2a3a",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            <div>
              <span style={{ color: AMBER }}>ANTHROPIC_ADMIN_KEY</span>
              <span style={{ color: "#71717a" }}>=</span>
              <span style={{ color: "#a1a1aa" }}>sk-ant-admin...</span>
            </div>
          </div>
          <p className="text-xs text-zinc-600">
            Add to <code className="text-zinc-500" style={{ backgroundColor: "#1a1a2a", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>.env.local</code>
          </p>
          <a
            href="https://console.anthropic.com/settings/admin-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium"
            style={{ color: AMBER }}
          >
            Get your admin key →
          </a>
        </div>
      ) : isEmpty ? (
        <div
          className="rounded-xl p-10 text-center space-y-3"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <p className="text-3xl">📊</p>
          <p className="text-zinc-400 font-medium">No data yet</p>
          <p className="text-xs text-zinc-600">
            Usage data will appear here once API calls are made.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total Tokens",
                value: fmtTokens(data!.totalTokens),
                sub: "last 30 days",
              },
              {
                label: "Input Tokens",
                value: fmtTokens(data!.totalInputTokens),
                sub: "prompt",
              },
              {
                label: "Output Tokens",
                value: fmtTokens(data!.totalOutputTokens),
                sub: "completion",
              },
              {
                label: "Actual Cost",
                value: fmtCost(data!.totalCostUSD),
                sub: "USD",
                highlight: true,
              },
            ].map(({ label, value, sub, highlight }) => (
              <div
                key={label}
                className="rounded-xl p-4 space-y-1"
                style={{
                  backgroundColor: "#111118",
                  border: highlight
                    ? `1px solid ${AMBER}40`
                    : "1px solid #1a1a2e",
                  boxShadow: highlight
                    ? `0 0 20px ${AMBER}10`
                    : undefined,
                }}
              >
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: highlight ? AMBER : "white" }}
                >
                  {value}
                </p>
                <p className="text-xs text-zinc-700">{sub}</p>
              </div>
            ))}
          </div>

          {/* Daily cost bar chart */}
          {data!.dailyCosts.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
            >
              <div className="px-5 py-3 border-b border-zinc-800/50">
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Last 30 days
                </p>
              </div>
              <div className="px-5 py-4">
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 2,
                    height: 120,
                    position: "relative",
                  }}
                >
                  {(() => {
                    const maxCost = Math.max(...data!.dailyCosts.map((d) => d.costUSD), 0.01)
                    return data!.dailyCosts.map((day, i) => {
                      const heightPct = Math.max((day.costUSD / maxCost) * 100, 2)
                      const isHovered = hoveredBar === i
                      return (
                        <div
                          key={day.date}
                          style={{
                            flex: 1,
                            height: `${heightPct}%`,
                            backgroundColor: isHovered ? AMBER : `${AMBER}88`,
                            borderRadius: "2px 2px 0 0",
                            cursor: "pointer",
                            transition: "background-color 0.15s, height 0.15s",
                            position: "relative",
                          }}
                          onMouseEnter={() => setHoveredBar(i)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {isHovered && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "calc(100% + 8px)",
                                left: "50%",
                                transform: "translateX(-50%)",
                                backgroundColor: "#1a1a2e",
                                border: "1px solid #2a2a3a",
                                borderRadius: 6,
                                padding: "6px 10px",
                                whiteSpace: "nowrap",
                                zIndex: 10,
                                fontSize: 12,
                                pointerEvents: "none",
                              }}
                            >
                              <div style={{ color: "#e4e4e7", fontWeight: 600 }}>
                                {fmtCost(day.costUSD)}
                              </div>
                              <div style={{ color: "#71717a", fontSize: 11 }}>
                                {fmtDate(day.date)}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Per-model breakdown */}
          {data!.byModel.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
            >
              <div className="px-5 py-3 border-b border-zinc-800/50">
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                  Breakdown by model
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/50">
                      <th className="text-left px-5 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Model
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Input
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Output
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Cache Created
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Cache Read
                      </th>
                      <th className="text-right px-5 py-2.5 text-xs text-zinc-600 font-medium uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.byModel.map((m) => (
                      <tr
                        key={m.model}
                        className="border-b border-zinc-800/30 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-zinc-300">
                          {m.model}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400">
                          {fmtTokens(m.inputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400">
                          {fmtTokens(m.outputTokens)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400">
                          {fmtTokens(m.cacheCreationTokens)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-400">
                          {fmtTokens(m.cacheReadTokens)}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-zinc-400">
                          {fmtTokens(m.totalTokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-700/50">
                      <td className="px-5 py-3 text-xs font-semibold text-zinc-300">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-zinc-300">
                        {fmtTokens(data!.totalInputTokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-zinc-300">
                        {fmtTokens(data!.totalOutputTokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-zinc-300">
                        {fmtTokens(data!.totalCacheCreationTokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-zinc-300">
                        {fmtTokens(data!.totalCacheReadTokens)}
                      </td>
                      <td
                        className="px-5 py-3 text-right text-sm font-bold"
                        style={{ color: AMBER }}
                      >
                        {fmtTokens(data!.totalTokens)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-5 py-2 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-700">
                  Actual costs from Anthropic Admin API · refreshes every 5 min
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
