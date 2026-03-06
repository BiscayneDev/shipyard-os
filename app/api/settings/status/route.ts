import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export interface ServiceStatus {
  id: string
  name: string
  description: string
  connected: boolean
  error?: string
}

async function checkOpenClaw(): Promise<ServiceStatus> {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return { id: "openclaw", name: "OpenClaw Gateway", description: "Local AI agent runtime", connected: false, error: "Not available on Vercel" }
  }
  try {
    const res = await fetch("http://127.0.0.1:18789/api/health", { signal: AbortSignal.timeout(3000) })
    return { id: "openclaw", name: "OpenClaw Gateway", description: "Local AI agent runtime", connected: res.ok }
  } catch (err) {
    return { id: "openclaw", name: "OpenClaw Gateway", description: "Local AI agent runtime", connected: false, error: err instanceof Error ? err.message : "Unreachable" }
  }
}

async function checkGoogleCalendar(): Promise<ServiceStatus> {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return { id: "google", name: "Google Calendar", description: "via gog CLI", connected: false, error: "Not available on Vercel" }
  }
  try {
    await execFileAsync("/opt/homebrew/bin/gog", ["auth", "list"], { timeout: 5000 })
    return { id: "google", name: "Google Calendar", description: "via gog CLI", connected: true }
  } catch (err) {
    return { id: "google", name: "Google Calendar", description: "via gog CLI", connected: false, error: err instanceof Error ? err.message : "Auth failed" }
  }
}

async function checkGitHub(): Promise<ServiceStatus> {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return { id: "github", name: "GitHub", description: "via gh CLI", connected: false, error: "Not available on Vercel" }
  }
  try {
    const { stderr } = await execFileAsync("/opt/homebrew/bin/gh", ["auth", "status"], { timeout: 5000 })
    const connected = !stderr.toLowerCase().includes("not logged") && !stderr.toLowerCase().includes("no accounts")
    return { id: "github", name: "GitHub", description: "via gh CLI", connected }
  } catch {
    return { id: "github", name: "GitHub", description: "via gh CLI", connected: false, error: "Not authenticated" }
  }
}

async function checkMoonPay(): Promise<ServiceStatus> {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return { id: "moonpay", name: "MoonPay CLI", description: "On-chain wallet access", connected: false, error: "Not available on Vercel" }
  }
  try {
    await execFileAsync("/opt/homebrew/bin/mooniq", ["wallet", "list"], { timeout: 5000 })
    return { id: "moonpay", name: "MoonPay CLI", description: "On-chain wallet access", connected: true }
  } catch {
    return { id: "moonpay", name: "MoonPay CLI", description: "On-chain wallet access", connected: false, error: "CLI unavailable or not authenticated" }
  }
}

export async function GET() {
  const results = await Promise.allSettled([
    checkOpenClaw(),
    checkGoogleCalendar(),
    checkGitHub(),
    checkMoonPay(),
  ])

  const statuses: ServiceStatus[] = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { id: "unknown", name: "Unknown", description: "", connected: false, error: "Check failed" }
  )

  return NextResponse.json(statuses)
}
