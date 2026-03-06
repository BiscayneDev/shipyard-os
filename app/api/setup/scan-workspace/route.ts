import { NextResponse } from "next/server"
import { access, readdir } from "fs/promises"
import { join } from "path"
import { homedir } from "os"

function resolvePath(p: string): string {
  if (p.startsWith("~/")) {
    return join(homedir(), p.slice(2))
  }
  return p
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { path: workspacePath } = body as { path: string }

    if (!workspacePath) {
      return NextResponse.json({ ok: false, found: [], missing: [], error: "Path required" })
    }

    const resolved = resolvePath(workspacePath.trim())
    const found: string[] = []
    const missing: string[] = []

    // Check MEMORY.md
    if (await exists(join(resolved, "MEMORY.md"))) {
      found.push("MEMORY.md")
    } else {
      missing.push("MEMORY.md")
    }

    // Check agents/ dir
    if (await exists(join(resolved, "agents"))) {
      found.push("agents/")
    } else {
      missing.push("agents/")
    }

    // Check for Scout agent
    const scoutPaths = [
      join(resolved, "agents", "scout", "SCOUT.md"),
      join(resolved, "SCOUT.md"),
    ]
    let scoutFound = false
    for (const sp of scoutPaths) {
      if (await exists(sp)) {
        scoutFound = true
        break
      }
    }
    // Also check any subfolder for SCOUT.md
    if (!scoutFound && (await exists(join(resolved, "agents")))) {
      try {
        const agentDirs = await readdir(join(resolved, "agents"))
        for (const dir of agentDirs) {
          if (await exists(join(resolved, "agents", dir, "SCOUT.md"))) {
            scoutFound = true
            break
          }
        }
      } catch {
        // ignore
      }
    }
    if (scoutFound) {
      found.push("Scout agent (SCOUT.md)")
    } else {
      missing.push("Scout agent")
    }

    // Check for Builder agent
    const builderPaths = [
      join(resolved, "agents", "builder", "BUILDER.md"),
      join(resolved, "BUILDER.md"),
    ]
    let builderFound = false
    for (const bp of builderPaths) {
      if (await exists(bp)) {
        builderFound = true
        break
      }
    }
    if (!builderFound && (await exists(join(resolved, "agents")))) {
      try {
        const agentDirs = await readdir(join(resolved, "agents"))
        for (const dir of agentDirs) {
          if (await exists(join(resolved, "agents", dir, "BUILDER.md"))) {
            builderFound = true
            break
          }
        }
      } catch {
        // ignore
      }
    }
    if (builderFound) {
      found.push("Builder agent (BUILDER.md)")
    } else {
      missing.push("Builder agent")
    }

    // Check for Baron agent
    const baronPaths = [
      join(resolved, "agents", "baron", "BARON.md"),
      join(resolved, "BARON.md"),
    ]
    let baronFound = false
    for (const bp of baronPaths) {
      if (await exists(bp)) {
        baronFound = true
        break
      }
    }
    if (baronFound) {
      found.push("Baron agent (BARON.md)")
    } else {
      missing.push("Baron agent")
    }

    return NextResponse.json({ ok: true, found, missing })
  } catch {
    return NextResponse.json(
      { ok: false, found: [], missing: [], error: "Failed to scan workspace" },
      { status: 500 }
    )
  }
}
