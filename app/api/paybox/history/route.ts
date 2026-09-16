import { NextResponse } from "next/server"
import { listPaymentHistory } from "@/lib/paybox"

export async function GET() {
  return NextResponse.json({ payments: await listPaymentHistory() })
}
