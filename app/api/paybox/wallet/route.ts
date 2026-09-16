import { NextResponse } from "next/server"
import { listPayboxCredentials, selectedWalletCredentialId } from "@/lib/paybox"
import { readFile, writeFile, mkdir } from "fs/promises"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "data", "paybox.json")

let memoryStore: Record<string, unknown> | null = null
// Assigned before every read in useMemoryStore() branch; kept nullable for the
// lazy seed, with a fallback so the return type always holds a record.
function useMemoryStore(): boolean {
  return (
    (Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV)) &&
    !process.env.KV_REST_API_URL
  )
}

async function readStore(): Promise<Record<string, unknown>> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      const store = await kv.get<Record<string, unknown>>("paybox")
      if (store) return store
    } catch {
      // fall through
    }
  }
  if (useMemoryStore()) {
    if (!memoryStore) {
      try {
        memoryStore = (JSON.parse(await readFile(DATA_PATH, "utf-8")) as Record<string, unknown>) ?? {}
      } catch {
        memoryStore = {}
      }
    }
    return memoryStore as Record<string, unknown>
  }
  try {
    return JSON.parse(await readFile(DATA_PATH, "utf-8"))
  } catch {
    return {}
  }
}

async function writeStore(store: Record<string, unknown>): Promise<void> {
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

/** Select the wallet credential to pay from (stored in data/paybox.json). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { credentialId?: string }
    if (!body.credentialId?.trim()) {
      return NextResponse.json({ error: "credentialId required" }, { status: 400 })
    }
    const credentialId = body.credentialId.trim()
    const credentials = await listPayboxCredentials()
    if (!credentials.some((c) => c.id === credentialId)) {
      return NextResponse.json({ error: "Unknown credential — refresh Paybox credentials" }, { status: 400 })
    }
    const store = await readStore()
    store.walletCredentialId = credentialId
    await writeStore(store)
    return NextResponse.json({ ok: true, wallet: credentialId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to select wallet"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ wallet: await selectedWalletCredentialId() })
}
