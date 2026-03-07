import { BIN } from "@/lib/config"
import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  // On Vercel/serverless, openclaw CLI isn't available
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return NextResponse.json({ error: "remote", message: "Skills require a local OpenClaw instance." }, { status: 503 })
  }
  try {
    const { stdout } = await execAsync(`${BIN.openclaw} skills list --json`, {
      env: { ...process.env, PATH: `${BIN.openclaw.replace(/\/[^/]+$/, "")}:/usr/local/bin:/usr/bin:/bin` }
    })
    const data = JSON.parse(stdout)
    // openclaw returns { skills: [...], workspaceDir, managedSkillsDir }
    const raw: Array<Record<string, unknown>> = Array.isArray(data) ? data : (data.skills ?? [])

    // Map CLI fields to frontend-expected shape
    const skills = raw.map((s) => ({
      name: s.name,
      description: s.description,
      emoji: s.emoji,
      source: typeof s.source === "string"
        ? s.source.replace("openclaw-", "").replace("-personal", "").replace("-workspace", "workspace")
        : s.source,
      homepage: s.homepage,
      status: s.disabled
        ? "disabled"
        : s.eligible
        ? "ready"
        : "missing",
    }))

    return NextResponse.json(skills)
  } catch (err) {
    console.error("Skills API error:", err)
    return NextResponse.json([], { status: 200 })
  }
}
