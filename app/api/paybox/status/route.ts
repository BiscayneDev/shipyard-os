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
  const network = payboxNetwork()

  // Live balances for the selected wallet (best-effort; null when offline).
  let balances: { usdc: number; sol: number } | null = null
  if (configured && wallet) {
    const selected = credentials.find((c) => c.id === wallet)
    if (selected?.address) {
      try {
        const web3 = await import("@solana/web3.js")
        const splToken = await import("@solana/spl-token")
        const rpc =
          network === "mainnet"
            ? "https://api.mainnet-beta.solana.com"
            : "https://api.devnet.solana.com"
        const usdcMint = new web3.PublicKey(
          network === "mainnet"
            ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
            : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        )
        const conn = new web3.Connection(rpc, "confirmed")
        const owner = new web3.PublicKey(selected.address)
        const ata = await splToken.getAssociatedTokenAddress(usdcMint, owner)
        const usdc = await splToken
          .getAccount(conn, ata)
          .then((a) => Number(a.amount) / 1_000_000)
          .catch(() => 0)
        const sol = (await conn.getBalance(owner).catch(() => 0)) / 1_000_000_000
        balances = { usdc, sol }
      } catch {
        balances = null
      }
    }
  }

  return NextResponse.json({
    configured,
    credentials,
    wallet,
    network,
    balances,
  })
}
