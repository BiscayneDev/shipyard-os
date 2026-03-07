import { BIN } from "@/lib/config"
import { runtime } from "@/lib/runtime"
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
  const health = await runtime.healthCheck()
  return {
    id: "agent-runtime",
    name: `${runtime.name} Runtime`,
    description: "AI agent runtime",
    connected: health.ok,
    error: health.error,
  }
}

async function checkGoogleCalendar(): Promise<ServiceStatus> {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return { id: "google", name: "Google Calendar", description: "via gog CLI", connected: false, error: "Not available on Vercel" }
  }
  try {
    await execFileAsync(BIN.gog, ["auth", "list"], { timeout: 5000 })
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
    const { stderr } = await execFileAsync(BIN.gh, ["auth", "status"], { timeout: 5000 })
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
    await execFileAsync(BIN.moonpay, ["wallet", "list"], { timeout: 5000 })
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
