import { NextResponse } from "next/server"
import { listAlerts, syncDerivedAlertsFromRuns } from "@/lib/alerts"

export async function GET() {
  await syncDerivedAlertsFromRuns()
  return NextResponse.json(await listAlerts())
}
