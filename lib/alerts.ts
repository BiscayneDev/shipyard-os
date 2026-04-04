import { mkdir, readFile, writeFile } from "fs/promises"
import { randomUUID } from "crypto"
import { dirname, join } from "path"
import { getConversation, listConversations } from "@/lib/conversations"

export type AlertSeverity = "info" | "warning" | "critical"
export type AlertStatus = "open" | "acknowledged" | "resolved" | "snoozed"

export interface AlertRecord {
  id: string
  type: string
  severity: AlertSeverity
  status: AlertStatus
  title: string
  summary: string
  conversationId?: string
  runId?: string
  taskId?: string
  createdAt: string
  updatedAt: string
}

interface AlertStore {
  alerts: AlertRecord[]
}

const DATA_PATH = join(process.cwd(), "data", "alerts.json")
const KV_KEY = "alerts"
const MAX_ALERTS = 500
const DERIVED_FAILED_RUN_TYPE = "run.failed"

function defaultStore(): AlertStore {
  return { alerts: [] }
}

function sortAlerts(alerts: AlertRecord[]): AlertRecord[] {
  return alerts.slice().sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
}

async function readStoreFromFile(): Promise<AlertStore> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8")
    const parsed = JSON.parse(raw) as AlertStore
    if (parsed && Array.isArray(parsed.alerts)) return parsed
    return defaultStore()
  } catch {
    return defaultStore()
  }
}

async function writeStoreToFile(store: AlertStore): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true })
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf-8")
}

async function readStore(): Promise<AlertStore> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      const store = await kv.get<AlertStore>(KV_KEY)
      if (store && Array.isArray(store.alerts)) return store
    } catch {
      // fall through
    }
  }
  return readStoreFromFile()
}

async function writeStore(store: AlertStore): Promise<void> {
  const trimmed = { alerts: sortAlerts(store.alerts).slice(0, MAX_ALERTS) }
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv")
      await kv.set(KV_KEY, trimmed)
      return
    } catch {
      // fall through
    }
  }
  await writeStoreToFile(trimmed)
}

export async function listAlerts(): Promise<AlertRecord[]> {
  const store = await readStore()
  return sortAlerts(store.alerts)
}

export async function createAlert(input: Omit<AlertRecord, "id" | "createdAt" | "updatedAt">): Promise<AlertRecord> {
  const now = new Date().toISOString()
  const alert: AlertRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...input,
  }
  const store = await readStore()
  store.alerts = [alert, ...store.alerts]
  await writeStore(store)
  return alert
}

export async function updateAlert(id: string, patch: Partial<Pick<AlertRecord, "status">>): Promise<AlertRecord | null> {
  if (!patch.status) return null
  const store = await readStore()
  const current = store.alerts.find((alert) => alert.id === id)
  if (!current) return null
  const updated: AlertRecord = {
    ...current,
    status: patch.status,
    updatedAt: new Date().toISOString(),
  }
  store.alerts = store.alerts.map((alert) => (alert.id === id ? updated : alert))
  await writeStore(store)
  return updated
}

function alertKey(type: string, conversationId?: string, runId?: string): string {
  return [type, conversationId ?? "", runId ?? ""].join("::")
}

function sortByUpdatedAtDesc(alerts: AlertRecord[]): AlertRecord[] {
  return alerts.slice().sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
}

export async function syncDerivedAlertsFromRuns(): Promise<void> {
  const store = await readStore()
  const conversations = await listConversations()
  const activeFailedRuns = new Map<
    string,
    {
      conversationId: string
      runId: string
      taskId?: string
      title: string
      summary: string
    }
  >()

  for (const summary of conversations) {
    const conversation = await getConversation(summary.id)
    if (!conversation) continue

    for (const run of conversation.runs) {
      if (run.status !== "failed") continue
      activeFailedRuns.set(alertKey(DERIVED_FAILED_RUN_TYPE, conversation.id, run.id), {
        conversationId: conversation.id,
        runId: run.id,
        taskId: run.taskId ?? conversation.taskId,
        title: `${conversation.title} failed`,
        summary: run.error?.trim() || `${run.agent} failed in ${run.runtime}`,
      })
    }
  }

  const alertsByKey = new Map<string, AlertRecord[]>()
  for (const alert of store.alerts) {
    if (alert.type !== DERIVED_FAILED_RUN_TYPE) continue
    const key = alertKey(alert.type, alert.conversationId, alert.runId)
    const matches = alertsByKey.get(key)
    if (matches) {
      matches.push(alert)
    } else {
      alertsByKey.set(key, [alert])
    }
  }

  const now = new Date().toISOString()
  const nextAlerts = [...store.alerts]

  for (const [key, failedRun] of activeFailedRuns) {
    const matches = sortByUpdatedAtDesc(alertsByKey.get(key) ?? [])
    if (matches.length === 0) {
      nextAlerts.unshift({
        id: randomUUID(),
        type: DERIVED_FAILED_RUN_TYPE,
        severity: "critical",
        status: "open",
        title: failedRun.title,
        summary: failedRun.summary,
        conversationId: failedRun.conversationId,
        runId: failedRun.runId,
        taskId: failedRun.taskId,
        createdAt: now,
        updatedAt: now,
      })
      continue
    }

    const [primary, ...duplicates] = matches
    Object.assign(primary, {
      severity: "critical" as const,
      status: "open" as const,
      title: failedRun.title,
      summary: failedRun.summary,
      conversationId: failedRun.conversationId,
      runId: failedRun.runId,
      taskId: failedRun.taskId,
      updatedAt: now,
    })

    for (const duplicate of duplicates) {
      if (duplicate.status !== "resolved") {
        duplicate.status = "resolved"
        duplicate.updatedAt = now
      }
    }
  }

  for (const alert of nextAlerts) {
    if (alert.type !== DERIVED_FAILED_RUN_TYPE) continue
    const key = alertKey(alert.type, alert.conversationId, alert.runId)
    if (activeFailedRuns.has(key) || alert.status === "resolved") continue
    alert.status = "resolved"
    alert.updatedAt = now
  }

  await writeStore({ alerts: nextAlerts })
}
