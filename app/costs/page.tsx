"use client"

import { useEffect, useState } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface OperatorOverview {
  requests: number
  inputTokens: number
  outputTokens: number
  actualCostUsd: number
  baselineCostUsd: number
  savedUsd: number
  savingsPct: number
  revenueUsd: number
  marginUsd: number
  errors: number
  errorRate: number
  cacheHitRate: number
  failovers: number
  latencyP50Ms?: number
  latencyP95Ms?: number
  users: number
}

interface OperatorBreakdownRow {
  key: string
  requests: number
  inputTokens: number
  outputTokens: number
  actualCostUsd: number
  baselineCostUsd: number
  savedUsd: number
  revenueUsd: number
  avgLatencyMs?: number
  errors: number
}

interface OperatorBilling {
  revenueUsd: number
  actualCostUsd: number
  marginUsd: number
  settledUsd: number
  stuck: number
  settlements?: Array<{
    at: number
    userId?: string
    amountUsd: number
    status: string
    signature?: string
    network?: string
  }>
}

interface ShipyardData {
  configured: boolean
  overview?: OperatorOverview | null
  breakdown?: OperatorBreakdownRow[] | null
  billing?: OperatorBilling | null
}

interface AnthropicData {
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheReadTokens: number
  totalCostUSD: number
  byModel: Array<{
    model: string
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    totalTokens: number
  }>
  dailyCosts: Array<{ date: string; costUSD: number }>
  dataSource: string
  lastUpdated: string | null
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number, compact = false): string {
  if (!Number.isFinite(n)) return "—"
  if (n === 0) return "$0"
  if (n < 0.01) return `$${n.toFixed(4)}`
  if (n < 1) return `$${n.toFixed(3)}`
  if (compact && n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function timeAgoMs(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeAgoIso(iso: string): string {
  return timeAgoMs(new Date(iso).getTime())
}

function shortSig(sig: string | undefined): string {
  if (!sig) return "—"
  return `${sig.slice(0, 8)}…${sig.slice(-6)}`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CostsPage() {
  const [shipyard, setShipyard] = useState<ShipyardData | null>(null)
  const [anthropic, setAnthropic] = useState<AnthropicData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/costs/shipyard")
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/costs")
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([s, a]) => {
      setShipyard(s as ShipyardData | null)
      setAnthropic(a as AnthropicData | null)
      setLoading(false)
    })
  }, [])

  const o = shipyard?.overview ?? null
  const b = shipyard?.billing ?? null
  const breakdown = shipyard?.breakdown ?? null
  const settlements = [...(b?.settlements ?? [])].sort((x, y) => y.at - x.at).slice(0, 6)
  const hasAnthropic =
    anthropic && !anthropic.error && anthropic.byModel.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Kicker + title */}
      <div>
        <p
          className="flex items-center gap-2.5 font-mono text-[9.5px] uppercase tracking-[0.16em]"
          style={{ color: "var(--ink-3)" }}
        >
          <span
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: "var(--gold)", boxShadow: "0 0 8px var(--gold)" }}
          />
          spend · savings · settlements
        </p>
        <h1
          className="mt-3 font-serif text-[40px] leading-[1.05] tracking-[-0.01em]"
          style={{ color: "var(--ink)" }}
        >
          Costs
        </h1>
      </div>

      {loading ? (
        <p className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>
          Loading…
        </p>
      ) : (
        <>
          {/* ── Shipyard Inference: the hero ─────────────────────────────── */}
          {o ? (
            <section
              className="space-y-5 rounded-[17px] p-6"
              style={{
                border: "1px solid var(--line)",
                background: "linear-gradient(180deg, var(--surface-1), #08080b)",
              }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-mono text-[9.5px] uppercase tracking-[0.16em]"
                  style={{ color: "var(--ink-3)" }}
                >
                  Inference · Shipyard gateway · last 24h
                </p>
                <span
                  className="rounded-full border px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em]"
                  style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}
                >
                  {b?.settledUsd !== undefined ? `${fmtUsd(b.settledUsd)} settled` : "gateway live"}
                </span>
              </div>

              {/* Hero numbers */}
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <div>
                  <p className="font-serif text-[27px] tabular-nums" style={{ color: "var(--ink)" }}>
                    {o.requests}
                  </p>
                  <p
                    className="font-mono text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    requests
                  </p>
                </div>
                <div>
                  <p className="font-serif text-[27px] tabular-nums" style={{ color: "var(--ink)" }}>
                    {fmtUsd(o.actualCostUsd)}
                  </p>
                  <p
                    className="font-mono text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    actual spend
                  </p>
                </div>
                <div>
                  <p className="font-serif text-[27px] tabular-nums" style={{ color: "var(--gold)" }}>
                    {fmtUsd(o.savedUsd)}
                  </p>
                  <p
                    className="font-mono text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    saved vs baseline
                  </p>
                </div>
                <div>
                  <p className="font-serif text-[27px] tabular-nums" style={{ color: "var(--ink-2)" }}>
                    {fmtUsd(o.revenueUsd)}
                  </p>
                  <p
                    className="font-mono text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    billable revenue
                  </p>
                </div>
              </div>

              {/* Secondary row */}
              <div
                className="flex flex-wrap gap-x-8 gap-y-2 border-t pt-4"
                style={{ borderColor: "var(--line)" }}
              >
                {[
                  ["savings rate", o.savingsPct > 0 ? fmtPct(o.savingsPct) : "—"],
                  ["margin", fmtUsd(b?.marginUsd ?? o.marginUsd)],
                  ["tokens", fmtTokens(o.inputTokens + o.outputTokens)],
                  ["cache hit", fmtPct(o.cacheHitRate)],
                  ["errors", String(o.errors)],
                  ["p95 latency", o.latencyP95Ms ? `${Math.round(o.latencyP95Ms)}ms` : "—"],
                ].map(([label, value]) => (
                  <span
                    key={label}
                    className="font-mono text-[10.5px]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {label}
                    <span className="ml-2 tabular-nums" style={{ color: "var(--ink-2)" }}>
                      {value}
                    </span>
                  </span>
                ))}
              </div>

              {/* Per-model breakdown */}
              {breakdown && breakdown.length > 0 && (
                <div className="space-y-1.5">
                  <p
                    className="font-mono text-[9.5px] uppercase tracking-[0.16em]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    By model
                  </p>
                  {breakdown.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-4">
                      <span className="font-mono text-[11px]" style={{ color: "var(--ink-2)" }}>
                        {row.key}
                        <span
                          className="ml-3 font-mono text-[10px]"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {row.requests} req
                        </span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-4 font-serif text-[14px] tabular-nums">
                        <span style={{ color: "var(--ink-2)" }}>{fmtUsd(row.actualCostUsd)}</span>
                        <span style={{ color: "var(--gold)" }}>−{fmtUsd(row.savedUsd)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Settlements */}
              {settlements.length > 0 && (
                <div className="space-y-1.5">
                  <p
                    className="font-mono text-[9.5px] uppercase tracking-[0.16em]"
                    style={{ color: "var(--ink-3)" }}
                  >
                    x402 settlements
                  </p>
                  {settlements.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <span
                        className="truncate font-mono text-[10.5px]"
                        style={{ color: "var(--ink-3)", maxWidth: "55%" }}
                      >
                        {s.userId ? `${s.userId.slice(0, 6)}…${s.userId.slice(-4)} · ` : ""}
                        {shortSig(s.signature)}
                      </span>
                      <span className="flex shrink-0 items-baseline gap-3">
                        <span
                          className="font-serif text-[14px] tabular-nums"
                          style={{ color: "var(--gold)" }}
                        >
                          {fmtUsd(s.amountUsd)}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                          {timeAgoMs(s.at)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section
              className="rounded-[17px] p-6"
              style={{ border: "1px solid var(--line)", backgroundColor: "var(--surface-1)" }}
            >
              <p className="text-[13px]" style={{ color: "var(--ink-2)" }}>
                Inference telemetry not configured — set SHIPYARD_OPERATOR_URL and
                SHIPYARD_OPERATOR_TOKEN to see gateway spend, savings, and settlements here.
              </p>
            </section>
          )}

          {/* ── Anthropic direct spend: secondary ──────────────────────────── */}
          <section
            className="space-y-4 rounded-[15px] p-6"
            style={{
              border: "1px solid var(--line)",
              background: "linear-gradient(180deg, var(--surface-1), #08080b)",
            }}
          >
            <div className="flex items-baseline justify-between gap-4">
              <p
                className="font-mono text-[9.5px] uppercase tracking-[0.16em]"
                style={{ color: "var(--ink-3)" }}
              >
                Direct provider spend · Anthropic
              </p>
              <p className="font-serif text-[19px] tabular-nums" style={{ color: "var(--ink-2)" }}>
                {hasAnthropic ? fmtUsd(anthropic!.totalCostUSD) : "—"}
              </p>
            </div>
            {hasAnthropic ? (
              <div className="space-y-1.5">
                {anthropic!.byModel.slice(0, 5).map((m) => (
                  <div key={m.model} className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[11px]" style={{ color: "var(--ink-2)" }}>
                      {m.model}
                    </span>
                    <span
                      className="font-mono text-[10.5px] tabular-nums"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {fmtTokens(m.totalTokens)} tok
                    </span>
                  </div>
                ))}
                <p
                  className="pt-2 font-mono text-[10px]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {fmtTokens(anthropic!.totalTokens)} total · updated {timeAgoIso(anthropic!.lastUpdated ?? new Date().toISOString())}
                </p>
              </div>
            ) : (
              <p className="font-mono text-[10.5px]" style={{ color: "var(--ink-3)" }}>
                {anthropic?.error === "no_admin_key"
                  ? "Add ANTHROPIC_ADMIN_KEY to see direct Anthropic usage."
                  : "No direct Anthropic usage recorded."}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
