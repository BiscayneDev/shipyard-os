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
  inApp?: boolean
  hasSigningKey?: boolean
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
  const [banner, setBanner] = useState<string | null>(null)
  const [signingKey, setSigningKeyValue] = useState("")
  const [savingSigningKey, setSavingSigningKey] = useState(false)

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

  // Connect-flow result banner (?paybox=connected|error&reason=…).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const state = params.get("paybox")
    if (state === "connected") {
      setBanner("✓ Paybox connected")
      window.history.replaceState({}, "", window.location.pathname)
    } else if (state === "error") {
      setBanner(`✗ ${params.get("reason") ?? "connect failed"}`)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  async function saveSigningKey() {
    if (!signingKey.trim()) return
    setSavingSigningKey(true)
    try {
      const res = await fetch("/api/paybox/signing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signingKey: signingKey.trim() }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (data.error) setResult(`✗ ${data.error}`)
      else {
        setSigningKeyValue("")
        setBanner("✓ Signing key enabled — wallet payments unlocked")
        await refresh()
      }
    } finally {
      setSavingSigningKey(false)
    }
  }

  async function disconnect() {
    await fetch("/api/paybox/disconnect", { method: "POST" })
    setBanner("Paybox disconnected")
    await refresh()
  }

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
          <span className="flex items-center gap-3">
            {status?.inApp && (
              <button
                onClick={disconnect}
                className="font-mono text-[9.5px] uppercase tracking-[0.12em] transition-colors hover:opacity-70"
                style={{ color: "var(--ink-3)" }}
              >
                Disconnect
              </button>
            )}
            <span
              className="rounded-full border px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em]"
              style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}
            >
              {status?.network ?? "mainnet"}
            </span>
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

      {banner && (
        <p
          className="rounded-[10px] px-4 py-2.5 font-mono text-[11px]"
          style={{
            backgroundColor: banner.startsWith("✓") ? "rgba(231,201,121,0.08)" : "var(--surface-2)",
            border: `1px solid ${banner.startsWith("✓") ? "var(--gold)" : "var(--line)"}`,
            color: banner.startsWith("✓") ? "var(--gold)" : "var(--ink-2)",
          }}
        >
          {banner}
        </p>
      )}

      {loading ? (
        <p className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>
          Loading…
        </p>
      ) : !connected ? (
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
            Connect your Paybox vault to pay for x402 services — marketplace APIs, inference,
            pay.sh skills — straight from your own wallet. Approve once with your passkey;
            keys never leave Paybox.
          </p>
          <a
            href="/api/paybox/connect"
            className="inline-block rounded-[10px] px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-85"
            style={{ backgroundColor: "var(--gold)", color: "#1a1508" }}
          >
            Connect Paybox →
          </a>
          <p className="font-mono text-[10.5px] leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Don't have Paybox? Get a wallet at paybox.sh — it's free.
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

          {/* Signing key (unlocks wallet signing) */}
          {status?.hasSigningKey === false && (
            <div className="space-y-2">
              <p
                className="font-mono text-[9.5px] uppercase tracking-[0.16em]"
                style={{ color: "var(--ink-3)" }}
              >
                Signing key — enables paying from this wallet
              </p>
              <div className="flex gap-2">
                <input
                  value={signingKey}
                  onChange={(e) => setSigningKeyValue(e.target.value)}
                  placeholder="pbxk1.… (from the Paybox app → Settings → Signing keys)"
                  type="password"
                  className="flex-1 rounded-[10px] px-3.5 py-2.5 font-mono text-[11px] placeholder:text-[var(--ink-3)] focus:outline-none"
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                />
                <button
                  onClick={saveSigningKey}
                  disabled={savingSigningKey || !signingKey.trim()}
                  className="rounded-[10px] border px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-85 disabled:opacity-30"
                  style={{ borderColor: "var(--gold)", color: "var(--gold)" }}
                >
                  {savingSigningKey ? "Saving…" : "Enable"}
                </button>
              </div>
              <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                Read balances now; add the signing key to settle payments. It never leaves this server.
              </p>
            </div>
          )}

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
