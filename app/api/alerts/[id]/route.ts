import { NextResponse } from "next/server"
import { updateAlert, type AlertStatus } from "@/lib/alerts"

interface Context {
  params: Promise<{ id: string }>
}

const VALID_STATUSES = ["acknowledged", "resolved", "snoozed"] as const satisfies readonly AlertStatus[]

function isValidStatus(value: unknown): value is (typeof VALID_STATUSES)[number] {
  return typeof value === "string" && VALID_STATUSES.includes(value as (typeof VALID_STATUSES)[number])
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 })
  }

  const status = typeof body === "object" && body !== null ? (body as { status?: unknown }).status : undefined
  if (!isValidStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const nextStatus: (typeof VALID_STATUSES)[number] = status
  const updated = await updateAlert(id, { status: nextStatus })
  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ error: "Alert not found" }, { status: 404 })
}
