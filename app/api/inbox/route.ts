import { BIN, GOG_ACCOUNT } from "@/lib/config"
import { NextResponse } from "next/server"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export interface EmailEntry {
  id: string
  from: string
  fromName: string
  subject: string
  snippet: string
  date: string
}

const NOISE_PATTERNS = [
  "noreply",
  "no-reply",
  "newsletter",
  "notifications@",
  "updates@",
  "donotreply",
  "do-not-reply",
  "mailer@",
  "bounce@",
  "support@",
  "automated@",
  "alert@",
]

function isNoise(from: string): boolean {
  const lower = from.toLowerCase()
  return NOISE_PATTERNS.some((p) => lower.includes(p))
}

function extractName(from: string): string {
  // "John Doe <john@example.com>" -> "John Doe"
  const match = from.match(/^([^<]+)</)
  if (match) return match[1].trim()
  // "john@example.com" -> "john"
  const emailMatch = from.match(/([^@<\s]+)@/)
  if (emailMatch) return emailMatch[1]
  return from
}

interface RawMessage {
  id?: string
  from?: string
  subject?: string
  snippet?: string
  date?: string
  internalDate?: string
}

export async function GET() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ emails: [] })
  }

  try {
    const { stdout } = await execFileAsync(
      BIN.gog,
      [
        "gmail",
        "messages",
        "search",
        "in:inbox is:unread newer_than:2d",
        "--max",
        "8",
        "--json",
        "--account",
        GOG_ACCOUNT,
      ],
      { timeout: 10000 }
    )

    const raw = JSON.parse(stdout) as RawMessage[] | { messages?: RawMessage[] }
    const messages: RawMessage[] = Array.isArray(raw) ? raw : (raw.messages ?? [])

    const emails: EmailEntry[] = messages
      .filter((m) => {
        const from = m.from ?? ""
        return !isNoise(from)
      })
      .slice(0, 5)
      .map((m) => ({
        id: m.id ?? String(Math.random()),
        from: m.from ?? "",
        fromName: extractName(m.from ?? ""),
        subject: m.subject ?? "(no subject)",
        snippet: m.snippet ?? "",
        date: m.date ?? m.internalDate ?? new Date().toISOString(),
      }))

    return NextResponse.json({ emails })
  } catch {
    return NextResponse.json({ emails: [] })
  }
}
