import { NextResponse } from "next/server"
import {
  listPayboxCredentials,
  payboxEnvConfigured,
  payboxNetwork,
  selectedWalletCredentialId,
} from "@/lib/paybox"

export async function GET() {
  const configured = payboxEnvConfigured()
  const credentials = configured ? await listPayboxCredentials() : []
  const wallet = await selectedWalletCredentialId()
  return NextResponse.json({
    configured,
    credentials,
    wallet,
    network: payboxNetwork(),
  })
}
