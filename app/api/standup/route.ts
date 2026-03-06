import { WORKSPACE } from "@/lib/config"
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { homedir } from "os"
import path from "path"

interface StandupResponse {
  date: string
  entries: string[]
  filesRead: string[]
}

function getDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split("T")[0]
}

function parseMarkdownBullets(content: string): string[] {
  const lines = content.split("\n")
  const bullets: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match markdown bullets: - item, * item, or numbered list
    if (/^[-*]\s+.+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*]\s+/, "").trim())
    } else if (/^\d+\.\s+.+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^\d+\.\s+/, "").trim())
    } else if (trimmed.length > 20 && !trimmed.startsWith("#") && !trimmed.startsWith("```")) {
      // Include substantive non-header lines too
      bullets.push(trimmed)
    }
  }

  return bullets.filter((b) => b.length > 0).slice(0, 30) // cap at 30
}

export async function GET() {
  const memoryDir = WORKSPACE.memory

  const today = getDateStr(0)
  const yesterday = getDateStr(1)

  const allEntries: string[] = []
  const filesRead: string[] = []

  for (const dateStr of [yesterday, today]) {
    const filePath = path.join(memoryDir, `${dateStr}.md`)
    try {
      const content = await readFile(filePath, "utf-8")
      const bullets = parseMarkdownBullets(content)
      if (bullets.length > 0) {
        allEntries.push(`--- ${dateStr} ---`)
        allEntries.push(...bullets)
        filesRead.push(dateStr)
      }
    } catch {
      // file doesn't exist, skip
    }
  }

  const response: StandupResponse = {
    date: today,
    entries: allEntries,
    filesRead,
  }

  return NextResponse.json(response)
}
