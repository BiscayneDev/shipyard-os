/**
 * Agent Runtime Abstraction
 *
 * Decouples Shipyard OS from any specific agent runtime (OpenClaw, LangGraph, CrewAI, etc).
 * API routes import from here instead of calling OpenClaw directly.
 *
 * To add a new provider:
 *   1. Implement the AgentRuntime interface
 *   2. Add it to the `createRuntime()` factory
 *   3. Set AGENT_RUNTIME=your-provider in .env.local
 */

import { execFile } from "child_process"
import { promisify } from "util"
import { GATEWAY_URL, GATEWAY_TOKEN, AGENT_DELIVERY_TARGET, BIN } from "./config"

const execFileAsync = promisify(execFile)

// ── Types ────────────────────────────────────────────────────────────────────

export interface RuntimeSession {
  key: string
  model?: string
  [key: string]: unknown
}

export interface ActivateParams {
  taskId: string
  title: string
  description?: string
  assignee?: string
  priority?: string
  callbackUrl: string
}

export interface ChatParams {
  message: string
  sessionId?: string
}

export interface AgentRuntime {
  /** Human-readable name of the runtime */
  readonly name: string

  /** Check if the runtime is reachable */
  healthCheck(): Promise<{ ok: boolean; version?: string; error?: string }>

  /** List active agent sessions */
  listSessions(): Promise<RuntimeSession[]>

  /** Send a message to an agent and get a reply (chat) */
  chat(params: ChatParams): Promise<string>

  /** Fire-and-forget: activate an agent for a task */
  activate(params: ActivateParams): Promise<void>

  /** Send a test message to a delivery channel */
  testDelivery(channel: string, target: string, message: string): Promise<void>
}

// ── OpenClaw Provider ────────────────────────────────────────────────────────

class OpenClawRuntime implements AgentRuntime {
  readonly name = "OpenClaw"

  async healthCheck() {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/health`, {
        headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }

      interface HealthData { version?: string; openclaw_version?: string; gateway_version?: string }
      const data = (await res.json().catch(() => ({}))) as HealthData
      const version = data.version ?? data.openclaw_version ?? data.gateway_version
      return { ok: true, version }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unreachable" }
    }
  }

  async listSessions(): Promise<RuntimeSession[]> {
    if (!GATEWAY_TOKEN) return []
    try {
      const res = await fetch(`${GATEWAY_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data: unknown = await res.json()
      if (Array.isArray(data)) return data as RuntimeSession[]
      if (data && typeof data === "object" && "sessions" in data) {
        return (data as { sessions: RuntimeSession[] }).sessions
      }
      return []
    } catch {
      return []
    }
  }

  async chat({ message }: ChatParams): Promise<string> {
    // Try HTTP gateway first
    try {
      const res = await fetch(`${GATEWAY_URL}/api/agent/turn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({ message, sessionKey: "agent:main:main" }),
        signal: AbortSignal.timeout(30000),
      })

      if (res.ok) {
        interface GatewayReply { reply?: string; response?: string; text?: string; content?: string; message?: string }
        const data = (await res.json()) as GatewayReply
        const reply = data.reply ?? data.response ?? data.text ?? data.content ?? data.message
        if (reply) return reply
      }
    } catch {
      // Fall through to CLI
    }

    // Fallback: CLI
    try {
      const { stdout } = await execFileAsync(
        BIN.openclaw,
        ["agent", "--message", message, "--session-id", "agent:main:main", "--json"],
        { timeout: 30000 }
      )
      interface CLIReply { reply?: string; response?: string; text?: string; content?: string; output?: string }
      const parsed = JSON.parse(stdout) as CLIReply
      return parsed.reply ?? parsed.response ?? parsed.text ?? parsed.content ?? parsed.output ?? stdout.trim()
    } catch {
      return "Unable to reach agent runtime. Make sure the gateway is running."
    }
  }

  async activate({ message }: ActivateParams & { message: string }): Promise<void> {
    await execFileAsync(BIN.openclaw, ["agent", "--to", AGENT_DELIVERY_TARGET, "--message", message], {
      timeout: 30000,
      env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" },
    }).catch(() => null)
  }

  async testDelivery(channel: string, target: string, message: string): Promise<void> {
    await execFileAsync(
      BIN.openclaw,
      ["message", "send", "--channel", channel.toLowerCase(), "--target", target, "--message", message],
      { timeout: 10000 }
    )
  }
}

// ── Stub Provider (demo mode / no runtime) ───────────────────────────────────

class StubRuntime implements AgentRuntime {
  readonly name = "Demo"

  async healthCheck() {
    return { ok: true, version: "demo" }
  }

  async listSessions(): Promise<RuntimeSession[]> {
    return []
  }

  async chat(): Promise<string> {
    return "Running in demo mode — connect an agent runtime to activate chat."
  }

  async activate(): Promise<void> {
    // No-op in demo mode
  }

  async testDelivery(): Promise<void> {
    // No-op in demo mode
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

function createRuntime(): AgentRuntime {
  const provider = process.env.AGENT_RUNTIME?.toLowerCase() ?? "openclaw"

  // On Vercel or explicit demo mode, use stub
  if (process.env.VERCEL || process.env.VERCEL_ENV || provider === "demo") {
    return new StubRuntime()
  }

  switch (provider) {
    case "openclaw":
      return new OpenClawRuntime()
    // Future providers:
    // case "langgraph":
    //   return new LangGraphRuntime()
    // case "crewai":
    //   return new CrewAIRuntime()
    default:
      return new OpenClawRuntime()
  }
}

/** Singleton runtime instance */
export const runtime = createRuntime()
