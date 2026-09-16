import { NextResponse } from "next/server"
import { payX402, payboxEnvConfigured, selectedWalletCredentialId } from "@/lib/paybox"

/**
 * Call an x402 endpoint from the OS, settling any 402 challenge with a USDC
 * transfer signed inside the user's Paybox grant.
 */
export async function POST(request: Request) {
  try {
    if (!payboxEnvConfigured()) {
      return NextResponse.json(
        { error: "Paybox not connected — run `npx @paybox-sh/sdk login` and set PAYBOX_API_KEY / PAYBOX_SIGNING_KEY" },
        { status: 400 },
      )
    }
    if (!(await selectedWalletCredentialId())) {
      return NextResponse.json(
        { error: "No Paybox wallet selected — pick one on the Treasury page first" },
        { status: 400 },
      )
    }
    const body = (await request.json()) as {
      url?: string
      method?: string
      headers?: Record<string, string>
      body?: string
      credentialId?: string
    }
    if (!body.url?.trim()) {
      return NextResponse.json({ error: "url required" }, { status: 400 })
    }

    const result = await payX402({
      url: body.url.trim(),
      method: body.method,
      headers: body.headers,
      body: body.body,
      credentialId: body.credentialId,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
