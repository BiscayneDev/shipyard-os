import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"
import type { ExternalSkill } from "../route"

const EXTERNAL_SKILLS_PATH = join(process.cwd(), "data", "external-skills.json")

async function readExternalSkills(): Promise<ExternalSkill[]> {
  try {
    return JSON.parse(await readFile(EXTERNAL_SKILLS_PATH, "utf-8"))
  } catch { return [] }
}

async function writeExternalSkills(skills: ExternalSkill[]): Promise<void> {
  await mkdir(dirname(EXTERNAL_SKILLS_PATH), { recursive: true })
  await writeFile(EXTERNAL_SKILLS_PATH, JSON.stringify(skills, null, 2), "utf-8")
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      name?: string
      description?: string
      category?: string
      source_url?: string
    }

    if (!body.name || !body.description) {
      return NextResponse.json(
        { ok: false, error: "name and description are required" },
        { status: 400 }
      )
    }

    const existing = await readExternalSkills()

    if (existing.some(s => s.name === body.name)) {
      return NextResponse.json(
        { ok: false, error: `Skill "${body.name}" already exists` },
        { status: 409 }
      )
    }

    const skill: ExternalSkill = {
      name: body.name,
      description: body.description,
      category: body.category ?? "other",
      source_url: body.source_url,
      added_at: new Date().toISOString(),
    }

    const updated = [...existing, skill]
    await writeExternalSkills(updated)

    return NextResponse.json({ ok: true, skill }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { name } = await req.json() as { name?: string }

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "name is required" },
        { status: 400 }
      )
    }

    const existing = await readExternalSkills()
    const filtered = existing.filter(s => s.name !== name)

    if (filtered.length === existing.length) {
      return NextResponse.json(
        { ok: false, error: `Skill "${name}" not found` },
        { status: 404 }
      )
    }

    await writeExternalSkills(filtered)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
