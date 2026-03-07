import { execFile } from "child_process"
import { promisify } from "util"
import { GATEWAY_URL, GATEWAY_TOKEN, AGENT_DELIVERY_TARGET, BIN } from "../config"
import type { AgentRuntime, RuntimeSession, ActivateParams, ChatParams } from "./types"

const execFileAsync = promisify(execFile)

export class OpenClawRuntime implements AgentRuntime {
  readonly name = "OpenClaw"
  readonly id = "openclaw"

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
      env: { ...process.env, PATH: `${BIN.openclaw.replace(/\/[^/]+$/, "")}:/usr/local/bin:/usr/bin:/bin` },
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
