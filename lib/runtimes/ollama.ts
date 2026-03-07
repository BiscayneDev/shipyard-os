import { OLLAMA_BASE_URL, OLLAMA_MODEL } from "../config"
import type { AgentRuntime, RuntimeSession, ActivateParams, ChatParams } from "./types"

interface OllamaModel {
  name: string
  model: string
  size: number
  digest: string
  modified_at: string
}

interface OllamaChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface OllamaChatResponse {
  message: OllamaChatMessage
  done: boolean
  total_duration?: number
  eval_count?: number
  prompt_eval_count?: number
}

export class OllamaRuntime implements AgentRuntime {
  readonly name = "Ollama"
  readonly id = "ollama"

  async healthCheck() {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }

      const data = (await res.json()) as { models?: OllamaModel[] }
      const modelCount = data.models?.length ?? 0
      return { ok: true, version: `${modelCount} model${modelCount !== 1 ? "s" : ""} available` }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unreachable" }
    }
  }

  async listSessions(): Promise<RuntimeSession[]> {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/ps`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as { models?: Array<{ name: string; size: number }> }
      return (data.models ?? []).map((m) => ({ key: m.name, model: m.name }))
    } catch {
      return []
    }
  }

  async chat({ message }: ChatParams): Promise<string> {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [{ role: "user", content: message }] as OllamaChatMessage[],
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return `Ollama error (${res.status}): ${text || "Unknown error"}. Is the model '${OLLAMA_MODEL}' pulled?`
      }

      const data = (await res.json()) as OllamaChatResponse
      return data.message?.content ?? "No response from model."
    } catch (err) {
      return `Unable to reach Ollama at ${OLLAMA_BASE_URL}. ${err instanceof Error ? err.message : ""}`
    }
  }

  async activate({ title, description }: ActivateParams): Promise<void> {
    const prompt = `Task: ${title}${description ? `\n\nDescription: ${description}` : ""}\n\nPlease work on this task.`
    await this.chat({ message: prompt }).catch(() => null)
  }

  async testDelivery(_channel: string, _target: string, message: string): Promise<void> {
    const reply = await this.chat({ message })
    if (reply.startsWith("Unable to reach") || reply.startsWith("Ollama error")) {
      throw new Error(reply)
    }
  }

  /** List available models from Ollama */
  async listModels(): Promise<Array<{ name: string; size: number; modified: string }>> {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as { models?: OllamaModel[] }
      return (data.models ?? []).map((m) => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at,
      }))
    } catch {
      return []
    }
  }
}
