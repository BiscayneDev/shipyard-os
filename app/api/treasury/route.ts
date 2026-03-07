import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"
import { randomUUID } from "crypto"

// ── Types ────────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string
  label: string
  chain: "solana" | "ethereum" | "base" | "polygon" | "other"
  address: string
  balance?: number
  symbol?: string
  lastChecked?: string
  addedAt: string
}

export interface TreasuryTransaction {
  id: string
  walletId: string
  type: "inflow" | "outflow"
  amount: number
  symbol: string
  description: string
  timestamp: string
}

interface TreasuryData {
  wallets: Wallet[]
  transactions: TreasuryTransaction[]
}

// ── Storage ──────────────────────────────────────────────────────────────────

const DATA_PATH = join(process.cwd(), "data", "treasury.json")

async function readTreasury(): Promise<TreasuryData> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    return JSON.parse(raw) as TreasuryData
  } catch {
    return { wallets: [], transactions: [] }
  }
}

async function writeTreasury(data: TreasuryData): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true })
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8")
}

// ── Balance fetchers ─────────────────────────────────────────────────────────

async function fetchSolanaBalance(address: string): Promise<{ balance: number; symbol: string } | null> {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com"
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json() as { result?: { value?: number } }
    if (data.result?.value !== undefined) {
      return { balance: data.result.value / 1e9, symbol: "SOL" }
    }
    return null
  } catch {
    return null
  }
}

async function fetchEvmBalance(address: string, chain: string): Promise<{ balance: number; symbol: string } | null> {
  const rpcUrls: Record<string, string> = {
    ethereum: process.env.ETH_RPC_URL ?? "https://eth.llamarpc.com",
    base: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    polygon: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
  }
  const rpcUrl = rpcUrls[chain]
  if (!rpcUrl) return null

  const symbols: Record<string, string> = { ethereum: "ETH", base: "ETH", polygon: "MATIC" }

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json() as { result?: string }
    if (data.result) {
      const wei = parseInt(data.result, 16)
      return { balance: wei / 1e18, symbol: symbols[chain] ?? "ETH" }
    }
    return null
  } catch {
    return null
  }
}

async function refreshBalance(wallet: Wallet): Promise<Wallet> {
  let result: { balance: number; symbol: string } | null = null

  if (wallet.chain === "solana") {
    result = await fetchSolanaBalance(wallet.address)
  } else if (["ethereum", "base", "polygon"].includes(wallet.chain)) {
    result = await fetchEvmBalance(wallet.address, wallet.chain)
  }

  if (result) {
    return { ...wallet, balance: result.balance, symbol: result.symbol, lastChecked: new Date().toISOString() }
  }
  return { ...wallet, lastChecked: new Date().toISOString() }
}

// ── GET — list wallets with balances ──────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url)
  const refresh = url.searchParams.get("refresh") === "true"

  const data = await readTreasury()

  if (refresh && data.wallets.length > 0) {
    // Refresh balances for all wallets
    const updated = await Promise.all(data.wallets.map(refreshBalance))
    data.wallets = updated
    await writeTreasury(data)
  }

  // Calculate totals (rough — doesn't convert cross-chain)
  const totalBySymbol: Record<string, number> = {}
  for (const w of data.wallets) {
    if (w.balance !== undefined && w.symbol) {
      totalBySymbol[w.symbol] = (totalBySymbol[w.symbol] ?? 0) + w.balance
    }
  }

  return NextResponse.json({
    wallets: data.wallets,
    transactions: data.transactions.slice(-50),
    totals: totalBySymbol,
  })
}

// ── POST — add a wallet ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<Wallet>

    if (!body.address || !body.chain) {
      return NextResponse.json({ error: "address and chain are required" }, { status: 400 })
    }

    const wallet: Wallet = {
      id: randomUUID(),
      label: body.label ?? `${body.chain} wallet`,
      chain: body.chain,
      address: body.address,
      addedAt: new Date().toISOString(),
    }

    // Fetch initial balance
    const withBalance = await refreshBalance(wallet)

    const data = await readTreasury()
    data.wallets.push(withBalance)
    await writeTreasury(data)

    return NextResponse.json(withBalance, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to add wallet" }, { status: 500 })
  }
}

// ── DELETE — remove a wallet ─────────────────────────────────────────────

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const walletId = url.searchParams.get("id")
  if (!walletId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 })
  }

  const data = await readTreasury()
  data.wallets = data.wallets.filter((w) => w.id !== walletId)
  data.transactions = data.transactions.filter((t) => t.walletId !== walletId)
  await writeTreasury(data)

  return NextResponse.json({ ok: true })
}
