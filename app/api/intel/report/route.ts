import { WORKSPACE } from "@/lib/config"
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { homedir } from "os"
import path from "path"

const REPORT_PATH = WORKSPACE.scout.latest

export async function GET() {
  try {
    const raw = await readFile(REPORT_PATH, "utf-8")
    const report = JSON.parse(raw)
    return NextResponse.json(report)
  } catch {
    return NextResponse.json({ generatedAt: null, summary: "No report yet." }, { status: 200 })
  }
}
