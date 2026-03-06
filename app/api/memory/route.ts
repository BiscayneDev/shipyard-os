import { WORKSPACE } from "@/lib/config"
import { NextRequest, NextResponse } from "next/server"
import { readdir, readFile, stat } from "fs/promises"
import { homedir } from "os"
import path from "path"

interface MemoryFile {
  name: string
  date: string
  pinned: boolean
  size: number
  modified: string
}

interface MemoryListResponse {
  files: MemoryFile[]
  lastUpdated: string | null
}

interface MemoryContentResponse {
  name: string
  content: string
  date: string
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    const { searchParams } = new URL(request.url)
    const file = searchParams.get("file")
    if (file) {
      const empty: MemoryContentResponse = { name: file, content: "", date: file }
      return NextResponse.json(empty)
    }
    const empty: MemoryListResponse = { files: [], lastUpdated: null }
    return NextResponse.json(empty)
  }

  const { searchParams } = new URL(request.url)
  const fileParam = searchParams.get("file")

  const memoryDir = WORKSPACE.memory
  const longTermPath = WORKSPACE.memoryFile

  // Return file content
  if (fileParam) {
    try {
      let filePath: string
      let name: string

      if (fileParam === "MEMORY") {
        filePath = longTermPath
        name = "MEMORY"
      } else {
        filePath = path.join(memoryDir, `${fileParam}.md`)
        name = fileParam
      }

      const content = await readFile(filePath, "utf-8")
      const response: MemoryContentResponse = {
        name,
        content,
        date: fileParam,
      }
      return NextResponse.json(response)
    } catch {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }
  }

  // Return file list
  const files: MemoryFile[] = []

  // Add MEMORY.md as pinned entry
  try {
    const memStat = await stat(longTermPath)
    files.push({
      name: "MEMORY",
      date: "MEMORY",
      pinned: true,
      size: memStat.size,
      modified: memStat.mtime.toISOString(),
    })
  } catch {
    // MEMORY.md does not exist
  }

  // Read daily memory files
  try {
    const entries = await readdir(memoryDir)
    const mdFiles = entries.filter((f) => f.endsWith(".md"))

    for (const file of mdFiles) {
      try {
        const filePath = path.join(memoryDir, file)
        const fileStat = await stat(filePath)
        const date = file.replace(/\.md$/, "")
        files.push({
          name: date,
          date,
          pinned: false,
          size: fileStat.size,
          modified: fileStat.mtime.toISOString(),
        })
      } catch {
        // skip
      }
    }
  } catch {
    // memory dir does not exist
  }

  // Sort: pinned first, then by date descending
  files.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.date.localeCompare(a.date)
  })

  const lastUpdated =
    files.find((f) => !f.pinned)?.modified ?? null

  const response: MemoryListResponse = {
    files,
    lastUpdated,
  }
  return NextResponse.json(response)
}
