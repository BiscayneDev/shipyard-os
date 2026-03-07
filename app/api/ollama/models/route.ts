import { NextResponse } from "next/server"
import { OLLAMA_BASE_URL } from "@/lib/config"

interface OllamaModel {
  name: string
  model: string
  size: number
  digest: string
  modified_at: string
  details?: {
    parameter_size?: string
    quantization_level?: string
    family?: string
  }
}

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return NextResponse.json({ models: [], error: `Ollama returned ${res.status}` })
    }

    const data = (await res.json()) as { models?: OllamaModel[] }
    const models = (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size,
      modified: m.modified_at,
      parameterSize: m.details?.parameter_size ?? null,
      quantization: m.details?.quantization_level ?? null,
      family: m.details?.family ?? null,
    }))

    return NextResponse.json({ models })
  } catch (err) {
    return NextResponse.json({
      models: [],
      error: err instanceof Error ? err.message : "Cannot reach Ollama",
    })
  }
}
