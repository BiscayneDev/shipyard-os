import { NextResponse } from "next/server"

interface TestOllamaBody {
  url: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TestOllamaBody
    const baseUrl = body.url || "http://127.0.0.1:11434"

    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Ollama returned HTTP ${res.status}` })
    }

    const data = (await res.json()) as { models?: Array<{ name: string }> }
    const models = data.models ?? []

    return NextResponse.json({
      ok: true,
      modelCount: models.length,
      models: models.map((m) => m.name),
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Cannot reach Ollama",
    })
  }
}
