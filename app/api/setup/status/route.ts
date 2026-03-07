import { NextResponse } from "next/server"
import { readFile, access } from "fs/promises"
import { join } from "path"
import { homedir } from "os"

const SETUP_PATH = join(process.cwd(), "data", "setup.json")
const ENV_LOCAL_PATH = join(process.cwd(), ".env.local")

interface SetupData {
  completed: boolean
  demoMode?: boolean
  userName?: string
  assistantName?: string
  gatewayUrl?: string
  deliveryTarget?: string
  deliveryChannel?: string
  workspace?: string
  completedAt?: string
}

interface HealthCheck {
  name: string
  status: "pass" | "warn" | "fail"
  message: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const includeHealth = url.searchParams.get("health") === "true"

  try {
    const raw = await readFile(SETUP_PATH, "utf-8")
    const data = JSON.parse(raw) as SetupData

    const result: Record<string, unknown> = {
      completed: data.completed ?? false,
      demoMode: data.demoMode ?? false,
      userName: data.userName,
      assistantName: data.assistantName,
    }

    if (includeHealth && data.completed) {
      const checks: HealthCheck[] = []

      // Check 1: .env.local exists
      try {
        await access(ENV_LOCAL_PATH)
        const envContent = await readFile(ENV_LOCAL_PATH, "utf-8")
        const hasToken = envContent.includes("OPENCLAW_GATEWAY_TOKEN=")
        if (hasToken) {
          checks.push({ name: "Environment file", status: "pass", message: ".env.local found with gateway token" })
        } else {
          checks.push({ name: "Environment file", status: "warn", message: ".env.local exists but missing OPENCLAW_GATEWAY_TOKEN" })
        }
      } catch {
        checks.push({ name: "Environment file", status: data.demoMode ? "warn" : "fail", message: ".env.local not found — secrets not configured" })
      }

      // Check 2: Gateway connectivity (skip in demo mode)
      if (!data.demoMode && data.gatewayUrl) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 5000)
          const res = await fetch(`${data.gatewayUrl}/api/health`, {
            signal: controller.signal,
          })
          clearTimeout(timeout)
          if (res.ok) {
            checks.push({ name: "OpenClaw gateway", status: "pass", message: "Gateway is reachable" })
          } else {
            checks.push({ name: "OpenClaw gateway", status: "fail", message: `Gateway returned ${res.status}` })
          }
        } catch {
          checks.push({ name: "OpenClaw gateway", status: "fail", message: "Cannot reach gateway — is OpenClaw running?" })
        }
      } else if (data.demoMode) {
        checks.push({ name: "OpenClaw gateway", status: "warn", message: "Skipped — running in demo mode" })
      }

      // Check 3: Workspace directory
      const workspacePath = data.workspace
        ? data.workspace.replace("~", homedir())
        : join(homedir(), "clawd")
      try {
        await access(workspacePath)
        checks.push({ name: "Agent workspace", status: "pass", message: `${data.workspace || "~/clawd"} found` })
      } catch {
        checks.push({ name: "Agent workspace", status: "warn", message: `${data.workspace || "~/clawd"} not found — agents will create it on first run` })
      }

      const healthy = checks.every((c) => c.status !== "fail")
      result.healthy = healthy
      result.checks = checks
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ completed: false, demoMode: false })
  }
}
