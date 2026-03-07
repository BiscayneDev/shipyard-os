"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Wallet {
  id: string
  label: string
  chain: "solana" | "ethereum" | "base" | "polygon" | "other"
  address: string
  balance?: number
  symbol?: string
  lastChecked?: string
  addedAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHAIN_CONFIG: Record<string, { label: string; color: string; icon: string; explorer: string }> = {
  solana: { label: "Solana", color: "#9945ff", icon: "◎", explorer: "https://solscan.io/account/" },
  ethereum: { label: "Ethereum", color: "#627eea", icon: "Ξ", explorer: "https://etherscan.io/address/" },
  base: { label: "Base", color: "#0052ff", icon: "🔵", explorer: "https://basescan.org/address/" },
  polygon: { label: "Polygon", color: "#8247e5", icon: "⬡", explorer: "https://polygonscan.com/address/" },
  other: { label: "Other", color: "#71717a", icon: "🔗", explorer: "" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TreasuryPage() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [formLabel, setFormLabel] = useState("")
  const [formAddress, setFormAddress] = useState("")
  const [formChain, setFormChain] = useState<string>("solana")
  const [saving, setSaving] = useState(false)

  const fetchTreasury = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const res = await fetch(`/api/treasury${refresh ? "?refresh=true" : ""}`)
      const data = await res.json() as { wallets: Wallet[]; totals: Record<string, number> }
      setWallets(data.wallets ?? [])
      setTotals(data.totals ?? {})
    } catch { /* leave empty */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTreasury()
  }, [fetchTreasury])

  async function addWallet() {
    if (!formAddress.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/treasury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formLabel.trim() || undefined,
          address: formAddress.trim(),
          chain: formChain,
        }),
      })
      if (res.ok) {
        setAdding(false)
        setFormLabel("")
        setFormAddress("")
        fetchTreasury()
      }
    } finally { setSaving(false) }
  }

  async function removeWallet(id: string) {
    setWallets((prev) => prev.filter((w) => w.id !== id))
    await fetch(`/api/treasury?id=${id}`, { method: "DELETE" }).catch(() => fetchTreasury())
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Treasury</h1>
          <p className="text-sm text-zinc-500 mt-1">On-chain wallets and balances</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchTreasury(true)}
            disabled={refreshing}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
            style={{ border: "1px solid #1a1a2e", color: "#71717a" }}
          >
            {refreshing ? "Refreshing..." : "Refresh Balances"}
          </button>
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
            style={{
              backgroundColor: "rgba(236,72,153,0.15)",
              border: "1px solid rgba(236,72,153,0.3)",
              color: "#ec4899",
            }}
          >
            + Add Wallet
          </button>
        </div>
      </div>

      {/* Totals */}
      {Object.keys(totals).length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {Object.entries(totals).map(([symbol, amount]) => (
            <div
              key={symbol}
              className="rounded-xl px-5 py-3 flex items-center gap-3"
              style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
            >
              <span className="text-xl font-mono font-bold text-white">
                {amount < 0.001 ? amount.toFixed(6) : amount < 1 ? amount.toFixed(4) : amount.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-zinc-500 uppercase">{symbol}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Wallet Form */}
      {adding && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "#111118", border: "1px solid rgba(236,72,153,0.3)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#ec4899" }}>
            Add Wallet
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Label (optional)</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none"
                style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder='e.g. "Baron treasury"'
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Chain</label>
              <select
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}
                value={formChain}
                onChange={(e) => setFormChain(e.target.value)}
              >
                {Object.entries(CHAIN_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Wallet Address</label>
            <input
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none font-mono"
              style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a2e" }}
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="Paste wallet address..."
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={addWallet}
              disabled={saving || !formAddress.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#ec4899", color: "white" }}
            >
              {saving ? "Adding..." : "Add Wallet"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              style={{ backgroundColor: "#1a1a2e" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Wallet List */}
      {loading ? (
        <div
          className="rounded-2xl p-8 text-center text-xs text-zinc-600"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          Loading treasury...
        </div>
      ) : wallets.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center space-y-3"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <p className="text-3xl">🏦</p>
          <p className="text-sm text-zinc-400">No wallets configured</p>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto">
            Add wallet addresses to track balances across Solana, Ethereum, Base, and Polygon.
            Baron can monitor positions and execute DeFi strategies.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((wallet) => {
            const chain = CHAIN_CONFIG[wallet.chain] ?? CHAIN_CONFIG.other
            return (
              <div
                key={wallet.id}
                className="group rounded-xl p-4 transition-all hover:bg-white/[0.02]"
                style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: `${chain.color}18`, color: chain.color }}
                    >
                      {chain.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{wallet.label}</p>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${chain.color}18`, color: chain.color }}
                        >
                          {chain.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {chain.explorer ? (
                          <a
                            href={`${chain.explorer}${wallet.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {shortAddress(wallet.address)} ↗
                          </a>
                        ) : (
                          <span className="text-xs font-mono text-zinc-500">{shortAddress(wallet.address)}</span>
                        )}
                        <span className="text-[10px] text-zinc-700">
                          checked {relativeTime(wallet.lastChecked)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {wallet.balance !== undefined && (
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-white">
                          {wallet.balance < 0.001 ? wallet.balance.toFixed(6) :
                           wallet.balance < 1 ? wallet.balance.toFixed(4) :
                           wallet.balance.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase">{wallet.symbol}</p>
                      </div>
                    )}
                    <button
                      onClick={() => removeWallet(wallet.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-400 transition-all text-xs px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Back link */}
      <div className="pt-2">
        <Link href="/dashboard" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Dashboard
        </Link>
      </div>
    </div>
  )
}
