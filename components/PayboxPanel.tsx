"use client"

import { useCallback, useEffect, useState } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayboxCredential {
  id: string
  label?: string
  kind?: string
  address?: string
}

interface PayboxStatus {
  configured: boolean
  credentials: PayboxCredential[]
  wallet: string | null
  network: string
  balances?: { usdc: number; sol: number } | null
}

interface PaymentRecord {
  at: number
  url: string
  amountAtomic: string
  network: string
  reference?: string
}

interface PayResult {
  status: number
  contentType?: string
  text: string
  payments: Array<{ at: number; url: string; amountAtomic: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddress(addr: string | undefined): string {
  if (!addr) return ""
  return addr.length <= 12 ? addr : `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function atomicToUsdc(atomic: string): string {
  const n = Number(atomic) / 1_000_000
  return n < 0.01 ? n.toFixed(6) : n.toFixed(4)
}

function relativeTime(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function prettyResult(data: PayResult): string {
  if (data.contentType?.includes("json")) {
    try {
      return JSON.stringify(JSON.parse(data.text), null, 2).slice(0, 1200)
    } catch {
      // fall through to raw text
    }
  }
  return data.text.slice(0, 1200)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PayboxPanel() {
  const [status, setStatus] = useState<PayboxStatus | null>(null)
  const [history, setHistory] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [payUrl, setPayUrl] = useState("")
  const [payMethod, setPayMethod] = useState("GET")
  const [payBody, setPayBody] = useState("")
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        fetch("/api/paybox/status").then((r) => r.json()),
        fetch("/api/paybox/history").then((r) => r.json()),
      ])
      setStatus(s as PayboxStatus)
      setHistory((h.payments ?? []) as PaymentRecord[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function selectWallet(credentialId: string) {
    await fetch("/api/paybox/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credentialId }),
    })
    await refresh()
  }

  async function pay() {
    if (!payUrl.trim()) return
    setPaying(true)
    setResult(null)
    try {
      const res = await fetch("/api/paybox/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: payUrl.trim(),
          method: payMethod,
          ...(payMethod === "POST" && payBody.trim() ? { body: payBody.trim() } : {}),
        }),
      })
      const data = (await res.json()) as PayResult & { error?: string }
      if (data.error) {
        setResult(`✗ ${data.error}`)
      } else {
        const paid = data.payments.length > 0
        const header = paid
          ? `✓ Paid ${data.payments.map((p) => `${atomicToUsdc(p.amountAtomic)} USDC`).join(", ")} · HTTP ${data.status}`
          : `✓ No payment required · HTTP ${data.status}`
        setResult(`${header}\n\n${prettyResult(data)}`)
        await refresh()
      }
    } catch (err) {
      setResult(`✗ ${err instanceof Error ? err.message : "payment failed"}`)
    } finally {
      setPaying(false)
    }
  }

  const connected = status?.configured ?? false
  const totalSpent = history.reduce((acc, p) => acc + Number(p.amountAtomic) / 1e6, 0)

  return (
    <section
      className="space-y-5 rounded-[17px] p-6"
      style={{
        border: "1px solid var(--line)",
        background: "linear-gradient(180deg, var(--surface-1), #08080b)",
      }}
    >
      {/* Kicker + network */}
      <div className="flex items-center justify-between">
        <p
          className="flex items-center gap-2.5 font-mono text-[9.5px] uppercase tracking-[0.16em]"
          style={{ color: "var(--ink-3)" }}
        >
          <span
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: connected ? "var(--gold)" : "var(--ink-3)",
              boxShadow: connected ? "0 0 8px var(--gold)" : undefined,
              opacity: connected ? undefined : 0.5,
            }}
          />
          x402 payments · non-custodial
        </p>
        {connected && (
          <span
            className="rounded-full border px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em]"
            style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}
          >
            {status?.network ?? "mainnet"}
          </span>
        )}
      </div>

      {/* Title + live balances */}
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-[27px] leading-none tracking-[-0.01em]" style={{ color: "var(--ink)" }}>
          Paybox
        </h3>
        {connected && status?.balances && (
          <div className="flex items-baseline gap-5 font-serif text-[19px] tabular-nums">
            <span style={{ color: "var(--gold)" }}>
              {status.balances.usdc < 0.01 ? status.balances.usdc.toFixed(6) : status.balances.usdc.toFixed(2)}
              <span
                className="ml-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]"
                style={{ color: "var(--ink-3)" }}
              >
                usdc
              </span>
            </span>
            <span style={{ color: "var(--ink-2)" }}>
              {status.balances.sol.toFixed(3)}
              <span
                className="ml-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]"
                style={{ color: "var(--ink-3)" }}
              >
                sol
              </span>
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>
          Loading…
        </p>
      ) : !connected ? (
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
            Connect your Paybox vault to pay for x402 services — marketplace APIs, inference,
            pay.sh skills — straight from your own wallet. Keys never leave Paybox.
          </p>
          <code
            className="block rounded-[10px] px-4 py-2.5 font-mono text-[11px]"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          >
            npx @paybox-sh/sdk login
          </code>
          <p className="font-mono text-[10.5px]" style={{ color: "var(--ink-3)" }}>
            Then set PAYBOX_API_KEY (and PAYBOX_SIGNING_KEY for wallet signing) in .env.local.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet picker */}
          <div className="space-y-2">
            <p
              className="font-mono text-[9.5px] uppercase tracking-[0.16em]"
              style={{ color: "var(--ink-3)" }}
            >
              Paying wallet
            </p>
            <div className="flex flex-wrap gap-2">
              {status?.credentials.length === 0 ? (
                <p className="text-[12px]" style={{ color: "var(--ink-2)" }}>
                  No credentials in this vault.
                </p>
              ) : (
                status?.credentials.map((c) => {
                  const active = status.wallet === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectWallet(c.id)}
                      className="rounded-full border px-4 py-1.5 font-mono text-[11px] transition-colors"
                      style={
                        active
                          ? {
                              borderColor: "var(--gold)",
                              backgroundColor: "rgba(231,201,121,0.08)",
                              color: "var(--gold)",
                            }
                          : { borderColor: "var(--line)", color: "var(--ink-2)" }
                      }
                    >
                      {c.label || c.kind || "wallet"}
                      {c.address ? ` · ${shortAddress(c.address)}` : ""}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Pay form */}
          <div className="space-y-2">
            <p
              className="font-mono text-[9.5px] uppercase tracking-[0.16em]"
              style={{ color: "var(--ink-3)" }}
            >
              Pay an x402 endpoint
            </p>
            <div className="flex gap-2">
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="rounded-[10px] px-2.5 py-2.5 font-mono text-[11px]"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-2)",
                }}
              >
                <option>GET</option>
                <option>POST</option>
              </select>
              <input
                value={payUrl}
                onChange={(e) => setPayUrl(e.target.value)}
                placeholder="https://api.shipyard.market/v1/x402/…"
                className="flex-1 rounded-[10px] px-3.5 py-2.5 font-mono text-[11px] placeholder:text-[var(--ink-3)] focus:outline-none"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              />
              <button
                onClick={pay}
                disabled={paying || !payUrl.trim() || !status?.wallet}
                className="rounded-[10px] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-85 disabled:opacity-30"
                style={{ backgroundColor: "var(--gold)", color: "#1a1508" }}
              >
                {paying ? "Paying…" : "Pay"}
              </button>
            </div>
            {payMethod === "POST" && (
              <textarea
                value={payBody}
                onChange={(e) => setPayBody(e.target.value)}
                placeholder='{"model": "claude-haiku-4-5", "messages": [...]}'
                rows={3}
                className="w-full rounded-[10px] px-3.5 py-2.5 font-mono text-[11px] placeholder:text-[var(--ink-3)] focus:outline-none"
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              />
            )}
          </div>

          {/* Result */}
          {result && (
            <pre
              className="max-h-52 overflow-auto whitespace-pre-wrap rounded-[10px] px-4 py-3 font-mono text-[10.5px] leading-relaxed"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--line)",
                color: "var(--ink-2)",
              }}
            >
              {result}
            </pre>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p
                  className="font-mono text-[9.5px] uppercase tracking-[0.16em]"
                  style={{ color: "var(--ink-3)" }}
                >
                  Payments · {history.length}
                </p>
                <p className="font-serif text-[15px] tabular-nums" style={{ color: "var(--ink-2)" }}>
                  {totalSpent < 0.01 ? totalSpent.toFixed(6) : totalSpent.toFixed(4)}
                  <span className="ml-1 font-mono text-[9px] uppercase" style={{ color: "var(--ink-3)" }}>
                    usdc total
                  </span>
                </p>
              </div>
              {history.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span
                    className="truncate font-mono text-[10.5px]"
                    style={{ color: "var(--ink-3)", maxWidth: "55%" }}
                  >
                    {p.url.replace(/^https?:\/\//, "")}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3">
                    <span className="font-serif text-[14px] tabular-nums" style={{ color: "var(--gold)" }}>
                      {atomicToUsdc(p.amountAtomic)}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                      {relativeTime(p.at)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
