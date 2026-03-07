import { NextResponse } from "next/server"
import { listRuntimeNames, runtime } from "@/lib/runtime"

export async function GET() {
  const runtimes = listRuntimeNames()
  const active = runtime.name
  const activeId = (runtime as { id?: string }).id ?? "unknown"

  return NextResponse.json({
    active: activeId,
    activeName: active,
    available: runtimes,
  })
}
