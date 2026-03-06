import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, token } = body as { url: string; token: string }

    if (!url) {
      return NextResponse.json({ ok: false, error: "Gateway URL is required" })
    }

    // Try GET {url}/api/health with Authorization header
    try {
      const healthUrl = `${url.replace(/\/$/, "")}/api/health`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(healthUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token || ""}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        let version: string | undefined
        try {
          const data = await res.json() as Record<string, unknown>
          version =
            (data.version as string) ||
            (data.openclaw_version as string) ||
            (data.gateway_version as string) ||
            undefined
        } catch {
          // JSON parse failed — still ok
        }
        return NextResponse.json({ ok: true, version: version || "1.0" })
      }

      // Non-200 but reachable
      return NextResponse.json({
        ok: false,
        error: `Gateway returned ${res.status} ${res.statusText}`,
      })
    } catch (fetchErr) {
      // Try a plain fetch to the root to see if at least reachable
      try {
        const rootController = new AbortController()
        const rootTimeout = setTimeout(() => rootController.abort(), 3000)
        await fetch(url.replace(/\/$/, ""), { signal: rootController.signal })
        clearTimeout(rootTimeout)
        return NextResponse.json({
          ok: false,
          error: "Gateway reachable but /api/health endpoint not found. Check your URL.",
        })
      } catch {
        const errMsg =
          fetchErr instanceof Error ? fetchErr.message : "Connection failed"
        return NextResponse.json({
          ok: false,
          error: `Cannot reach gateway: ${errMsg}`,
        })
      }
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
  }
}
