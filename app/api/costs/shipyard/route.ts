import { NextResponse } from "next/server"

/**
 * Inference spend via the Shipyard Inference operator hub: usage, savings vs
 * baseline, modeled revenue/margin, and settled x402 payments. Server-side
 * proxy — the operator token never reaches the client.
 *
 * Env: SHIPYARD_OPERATOR_URL (e.g. https://shipyard-inference.vercel.app)
 *      SHIPYARD_OPERATOR_TOKEN
 */
export async function GET() {
  const base = process.env.SHIPYARD_OPERATOR_URL?.replace(/\/+$/, "")
  const token = process.env.SHIPYARD_OPERATOR_TOKEN
  if (!base || !token) {
    return NextResponse.json({ configured: false })
  }

  const windowMs = 24 * 60 * 60 * 1000
  const call = async (path: string): Promise<unknown | null> => {
    try {
      const res = await fetch(`${base}${path}${path.includes("?") ? "&" : "?"}windowMs=${windowMs}`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  const [overview, breakdown, billing] = await Promise.all([
    call("/api/overview"),
    call("/api/breakdown"),
    call("/api/billing"),
  ])

  return NextResponse.json({
    configured: true,
    windowMs,
    overview,
    breakdown,
    billing,
  })
}
