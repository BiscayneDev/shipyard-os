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
  return addr.length <= 12 ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`
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

// ── Component ────────────────────────────────────────────────────────────────

const CARD = { backgroundColor: "#111118", border: "1px solid #1a1a2e" }
const TEAL = { backgroundColor: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)", color: "#22d3ee" }

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
        setResult(
          `${paid ? "✓ Paid" : "✓ No payment needed"} · HTTP ${data.status}\n` +
            (paid ? `Settled ${data.payments.map((p) => `${atomicToUsdc(p.amountAtomic)} USDC`).join(", ")}\n` : "") +
            (data.text ? data.text.slice(0, 1200) : ""),
        )
        await refresh()
      }
    } catch (err) {
      setResult(`✗ ${err instanceof Error ? err.message : "payment failed"}`)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={CARD}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Paybox</span>
          <span className="text-[11px] text-zinc-500">non-custodial x402 wallet</span>
        </div>
        {status?.configured ? (
          <span
            className="text-[11px] px-2 py-1 rounded-full font-medium"
            style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#10b981" }}
          >
            connected · {status.network}
          </span>
        ) : (
          <span className="text-[11px] px-2 py-1 rounded-full font-medium text-zinc-500" style={{ border: "1px solid #1a1a2e" }}>
            not connected
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading…</p>
      ) : !status?.configured ? (
        <div className="text-xs text-zinc-500 space-y-2">
          <p>
            Connect your Paybox vault to pay for x402 services — marketplace APIs, inference, pay.sh skills —
            straight from your own wallet. Your keys never leave Paybox.
          </p>
          <code className="block text-[11px] px-3 py-2 rounded-lg" style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}>
            npx @paybox-sh/sdk login
          </code>
          <p className="text-[11px] text-zinc-600">
            Then set PAYBOX_API_KEY (and PAYBOX_SIGNING_KEY for wallet signing) in .env.local, or on Vercel for prod.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet picker */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Paying wallet</p>
            <div className="flex flex-wrap gap-2">
              {status.credentials.length === 0 ? (
                <p className="text-xs text-zinc-500">No credentials in this vault.</p>
              ) : (
                status.credentials.map((c) => {
                  const active = status.wallet === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectWallet(c.id)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={active ? TEAL : { border: "1px solid #1a1a2e", color: "#71717a" }}
                    >
                      {c.label || c.kind || "wallet"}{c.address ? ` · ${shortAddress(c.address)}` : ""}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Pay form */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Pay an x402 endpoint</p>
            <div className="flex gap-2">
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="px-2 py-2 rounded-lg text-xs text-zinc-300"
                style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}
              >
                <option>GET</option>
                <option>POST</option>
              </select>
              <input
                value={payUrl}
                onChange={(e) => setPayUrl(e.target.value)}
                placeholder="https://api.shipyard.market/v1/x402/…"
                className="flex-1 px-3 py-2 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600"
                style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}
              />
              <button
                onClick={pay}
                disabled={paying || !payUrl.trim() || !status.wallet}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                style={TEAL}
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
                className="w-full px-3 py-2 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600"
                style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}
              />
            )}
          </div>

          {/* Result */}
          {result && (
            <pre
              className="text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-auto px-3 py-2 rounded-lg text-zinc-300"
              style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}
            >
              {result}
            </pre>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Payments</p>
              {history.slice(0, 8).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-zinc-400 truncate max-w-[60%]">{p.url}</span>
                  <span className="text-zinc-500">
                    <span className="text-cyan-300 font-semibold">{atomicToUsdc(p.amountAtomic)} USDC</span> · {relativeTime(p.at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
