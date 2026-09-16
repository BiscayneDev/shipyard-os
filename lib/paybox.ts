/**
 * Paybox — the OS's non-custodial wallet for x402 payments.
 *
 * Paybox (paybox.sh) vaults the user's wallet behind passkey-gated grants; the
 * private key never reaches this app. We use the Paybox SDK to list credentials
 * and to sign settlement transactions *within the user's grant*, and
 * shipyard-inference's payment layer (payboxSigner + createSolanaPayProvider +
 * createPayingFetch) to settle x402 challenges transparently: call an endpoint,
 * on 402 sign the USDC transfer via Paybox, retry, return the paid result.
 *
 * Configuration (all optional — absent means "not connected"):
 *   PAYBOX_API_KEY      pbx_live_* personal API key (Vercel) — locally, the
 *                       SDK also reads ~/.config/paybox/config.json from
 *                       `paybox login`.
 *   PAYBOX_SIGNING_KEY  pbxk1.* signing key for in-process wallet signing.
 *   PAYBOX_BASE_URL     API origin override (default https://api.paybox.sh).
 *   PAYBOX_NETWORK      mainnet | devnet (default mainnet).
 *   PAYBOX_WALLET_ID    credentialId of the wallet to pay from; also selectable
 *                       from the treasury UI (stored in data/paybox.json).
 *   PAYBOX_MAX_PAYMENT_USDC  per-request spend cap, whole USDC (default 1).
 */

import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import type { PayboxClient } from "@paybox-sh/sdk"
import { createPayingFetch, createSolanaPayProvider, payboxSigner } from "shipyard-inference"

// ── Client ───────────────────────────────────────────────────────────────────

export function payboxEnvConfigured(): boolean {
  return Boolean(process.env.PAYBOX_API_KEY || process.env.PAYBOX_SIGNING_KEY)
}

/**
 * A Paybox client. Locally `PayboxClient.fromConfig()` also reads
 * ~/.config/paybox/config.json (written by `paybox login`); env vars are passed
 * as explicit overrides so Vercel deployments work with no filesystem.
 * Returns null when nothing is configured.
 */
export async function payboxClient(): Promise<PayboxClient | null> {
  try {
    const { PayboxClient } = await import("@paybox-sh/sdk")
    return PayboxClient.fromConfig({
      ...(process.env.PAYBOX_BASE_URL ? { baseUrl: process.env.PAYBOX_BASE_URL } : {}),
      ...(process.env.PAYBOX_API_KEY ? { apiKey: process.env.PAYBOX_API_KEY } : {}),
      ...(process.env.PAYBOX_SIGNING_KEY ? { signingKey: process.env.PAYBOX_SIGNING_KEY } : {}),
    })
  } catch {
    return null
  }
}

export function payboxNetwork(): "mainnet" | "devnet" {
  return process.env.PAYBOX_NETWORK === "devnet" ? "devnet" : "mainnet"
}

// ── Wallet selection + history (data/paybox.json, memory on Vercel) ──────────

interface PayboxPaymentRecord {
  at: number
  url: string
  amountAtomic: string
  network: string
  reference?: string
}

interface PayboxStore {
  walletCredentialId?: string
  payments?: PayboxPaymentRecord[]
}

const DATA_PATH = path.join(process.cwd(), "data", "paybox.json")
const MAX_HISTORY = 100

let memoryStore: PayboxStore | null = null

function useMemoryStore(): boolean {
  return (
    (Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV)) &&
    !process.env.KV_REST_API_URL
  )
}

async function readStore(): Promise<PayboxStore> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      const store = await kv.get<PayboxStore>("paybox")
      if (store) return store
    } catch {
      // fall through
    }
  }
  if (useMemoryStore()) {
    if (!memoryStore) {
      try {
        memoryStore = JSON.parse(await readFile(DATA_PATH, "utf-8")) as PayboxStore
      } catch {
        memoryStore = {}
      }
    }
    return memoryStore
  }
  try {
    return JSON.parse(await readFile(DATA_PATH, "utf-8")) as PayboxStore
  } catch {
    return {}
  }
}

async function writeStore(store: PayboxStore): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      await kv.set("paybox", store)
      return
    } catch {
      // fall through
    }
  }
  if (useMemoryStore()) {
    memoryStore = store
    return
  }
  await mkdir(path.dirname(DATA_PATH), { recursive: true })
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

/** The credentialId of the wallet to pay from (env beats the UI selection). */
export async function selectedWalletCredentialId(): Promise<string | null> {
  if (process.env.PAYBOX_WALLET_ID) return process.env.PAYBOX_WALLET_ID
  const store = await readStore()
  return store.walletCredentialId ?? null
}

async function recordPayment(record: PayboxPaymentRecord): Promise<void> {
  const store = await readStore()
  store.payments = [record, ...(store.payments ?? [])].slice(0, MAX_HISTORY)
  await writeStore(store)
}

export async function listPaymentHistory(): Promise<PayboxPaymentRecord[]> {
  const store = await readStore()
  return store.payments ?? []
}

// ── Credential listing ────────────────────────────────────────────────────────

export interface PayboxCredential {
  id: string
  label?: string
  kind?: string
  address?: string
}

/** List usable credentials from the connected Paybox vault. */
export async function listPayboxCredentials(): Promise<PayboxCredential[]> {
  const client = await payboxClient()
  if (!client) return []
  try {
    const grants = await client.listCredentials()
    return grants.map((g) => {
      const c = g.credential as {
        id?: string
        label?: string
        kind?: string
        metadata?: { address?: string }
      }
      return {
        id: c.id ?? "",
        label: c.label,
        kind: c.kind,
        address: c.metadata?.address,
      }
    })
  } catch {
    return []
  }
}

// ── Pay x402 ──────────────────────────────────────────────────────────────────

export interface PayX402Params {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  credentialId?: string
}

export interface PayX402Result {
  status: number
  contentType?: string
  text: string
  payments: PayboxPaymentRecord[]
}

/** Per-request cap in atomic USDC from PAYBOX_MAX_PAYMENT_USDC (default 1 USDC). */
function perRequestCapAtomic(): string {
  const usdc = Number(process.env.PAYBOX_MAX_PAYMENT_USDC ?? "1")
  return String(Math.max(1, Math.round((Number.isFinite(usdc) ? usdc : 1) * 1_000_000)))
}

/**
 * Call an x402 endpoint, settling any 402 challenge with a USDC transfer
 * signed inside the user's Paybox grant. Works against the Shipyard gateway,
 * marketplace listings, and any external Solana-flavor x402 endpoint
 * (pay.sh skills, RelAI, the bazaar).
 */
export async function payX402(params: PayX402Params): Promise<PayX402Result> {
  const credentialId = params.credentialId ?? (await selectedWalletCredentialId())
  if (!credentialId) {
    throw new Error("No Paybox wallet selected — pick a wallet credential first (or set PAYBOX_WALLET_ID)")
  }
  const url = new URL(params.url)
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http(s) URLs can be paid")
  }
  const network = payboxNetwork()

  const client = await payboxClient()
  const signer = await payboxSigner({ credentialId, network, ...(client ? { client } : {}) })
  const payment = await createSolanaPayProvider({ signer, network })
  const payments: PayboxPaymentRecord[] = []

  const payingFetch = createPayingFetch({
    paymentProvider: payment,
    spendCap: { perRequest: perRequestCapAtomic() },
    onPayment: (result) => {
      const record: PayboxPaymentRecord = {
        at: Date.now(),
        url: params.url,
        amountAtomic: result.amount,
        network,
        reference: result.reference,
      }
      payments.push(record)
      void recordPayment(record)
    },
  })

  const init: RequestInit = {
    method: params.method ?? "GET",
    headers: {
      ...(params.headers ?? {}),
      ...(params.body ? { "content-type": "application/json" } : {}),
    },
    ...(params.body ? { body: params.body } : {}),
  }

  const res = await payingFetch(params.url, init)
  const text = (await res.text()).slice(0, 50_000)
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? undefined,
    text,
    payments,
  }
}
