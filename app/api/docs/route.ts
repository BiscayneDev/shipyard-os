import { WORKSPACE } from "@/lib/config"
import { NextResponse } from "next/server"
import { readFile, readdir, stat } from "fs/promises"
import { join } from "path"
import { homedir } from "os"

export interface DocEntry {
  id: string
  title: string
  source: "scout-reports" | "research" | "agent-docs" | "memory"
  sourceLabel: string
  content: string
  updatedAt: string
}

const HOME = homedir()

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8")
  } catch {
    return null
  }
}

async function safeStatMtime(filePath: string): Promise<string> {
  try {
    const s = await stat(filePath)
    return s.mtime.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.(json|md)$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

async function loadScoutReports(): Promise<DocEntry[]> {
  const dir = WORKSPACE.scout.reports
  const docs: DocEntry[] = []
  try {
    const files = await readdir(dir)
    for (const file of files) {
      if (!file.endsWith(".json") && !file.endsWith(".md")) continue
      const filePath = join(dir, file)
      const content = await safeReadFile(filePath)
      if (!content) continue
      let displayContent = content
      if (file.endsWith(".json")) {
        try {
          const parsed = JSON.parse(content) as Record<string, unknown>
          // Flatten JSON to readable text
          displayContent = JSON.stringify(parsed, null, 2)
        } catch {
          displayContent = content
        }
      }
      const updatedAt = await safeStatMtime(filePath)
      docs.push({
        id: `scout-${slugify(file)}`,
        title: titleFromFilename(file),
        source: "scout-reports",
        sourceLabel: "Scout Reports",
        content: displayContent,
        updatedAt,
      })
    }
  } catch {
    // directory missing
  }
  return docs
}

async function loadSingleDoc(
  filePath: string,
  id: string,
  title: string,
  source: DocEntry["source"],
  sourceLabel: string
): Promise<DocEntry | null> {
  const content = await safeReadFile(filePath)
  if (!content) return null
  const updatedAt = await safeStatMtime(filePath)
  return { id, title, source, sourceLabel, content, updatedAt }
}

async function loadAllDocs(): Promise<DocEntry[]> {
  const [scoutReports, baron, builder, dealFlow, memory] = await Promise.all([
    loadScoutReports(),
    loadSingleDoc(
      WORKSPACE.baron.research,
      "baron-research",
      "Baron's Research",
      "research",
      "Research"
    ),
    loadSingleDoc(
      WORKSPACE.builder.doc,
      "builder-reference",
      "Builder Reference",
      "agent-docs",
      "Agent Docs"
    ),
    loadSingleDoc(
      WORKSPACE.dealFlow.doc,
      "deal-flow-reference",
      "Deal Flow Reference",
      "agent-docs",
      "Agent Docs"
    ),
    loadSingleDoc(
      WORKSPACE.memoryFile,
      "memory",
      "Long-Term Memory",
      "memory",
      "Memory"
    ),
  ])

  const docs: DocEntry[] = [
    ...(memory ? [memory] : []),
    ...scoutReports,
    ...(baron ? [baron] : []),
    ...(builder ? [builder] : []),
    ...(dealFlow ? [dealFlow] : []),
  ]

  return docs
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  const docs = await loadAllDocs()

  if (id) {
    const doc = docs.find((d) => d.id === id)
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(doc)
  }

  // Return list without full content to keep response small
  const list = docs.map(({ content: _c, ...rest }) => ({ ...rest, preview: _c.slice(0, 200) }))
  return NextResponse.json(list)
}
