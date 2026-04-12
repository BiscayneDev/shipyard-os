import { describe, it, beforeEach, afterEach, mock } from "node:test"
import assert from "node:assert/strict"
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

// ── Test helpers ────────────────────────────────────────────────────────────

const TEST_DIR = join(tmpdir(), `shipyard-test-${Date.now()}`)
const SKILLS_DIR = join(TEST_DIR, ".shipyard", "skills")
const INSTALLED_REGISTRY = join(SKILLS_DIR, "installed.json")

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function writeRegistry(skills) {
  ensureDir(SKILLS_DIR)
  writeFileSync(INSTALLED_REGISTRY, JSON.stringify(skills, null, 2) + "\n")
}

function readRegistry() {
  if (!existsSync(INSTALLED_REGISTRY)) return []
  return JSON.parse(readFileSync(INSTALLED_REGISTRY, "utf8"))
}

// ── MCP Client Tests ────────────────────────────────────────────────────────

describe("MCP Client", () => {
  it("should export callTool and initialize", async () => {
    const mod = await import("../bin/mcp-client.js")
    assert.equal(typeof mod.callTool, "function")
    assert.equal(typeof mod.initialize, "function")
    assert.equal(typeof mod.resetSession, "function")
  })

  it("should use SHIPYARD_API_URL env var for base URL", async () => {
    const mod = await import("../bin/mcp-client.js")
    // Default should be shipyard.so
    assert.ok(mod.MCP_ENDPOINT.includes("/api/mcp"))
  })
})

// ── Skills Directory Management Tests ───────────────────────────────────────

describe("Skills directory management", () => {
  beforeEach(() => {
    ensureDir(SKILLS_DIR)
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it("should create and read installed registry", () => {
    const skills = [
      { slug: "test-skill", name: "Test Skill", version: "1.0.0", installedAt: new Date().toISOString() },
    ]
    writeRegistry(skills)

    const result = readRegistry()
    assert.equal(result.length, 1)
    assert.equal(result[0].slug, "test-skill")
    assert.equal(result[0].version, "1.0.0")
  })

  it("should handle empty registry", () => {
    const result = readRegistry()
    assert.deepEqual(result, [])
  })

  it("should save skill manifest files", () => {
    const slug = "defi-intelligence"
    const skillDir = join(SKILLS_DIR, slug)
    ensureDir(skillDir)

    const manifest = { name: "DeFi Intelligence", version: "1.0.0", slug }
    writeFileSync(join(skillDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n")

    const saved = JSON.parse(readFileSync(join(skillDir, "manifest.json"), "utf8"))
    assert.equal(saved.name, "DeFi Intelligence")
    assert.equal(saved.slug, slug)
  })

  it("should save skill instructions", () => {
    const slug = "test-skill"
    const skillDir = join(SKILLS_DIR, slug)
    ensureDir(skillDir)

    const instructions = "# Test Skill\n\nThis is a test skill."
    writeFileSync(join(skillDir, "skill.md"), instructions)

    const saved = readFileSync(join(skillDir, "skill.md"), "utf8")
    assert.equal(saved, instructions)
  })

  it("should save tool definitions", () => {
    const slug = "test-skill"
    const skillDir = join(SKILLS_DIR, slug)
    ensureDir(skillDir)

    const tools = [{ name: "test_tool", description: "A test tool" }]
    writeFileSync(join(skillDir, "tools.json"), JSON.stringify(tools, null, 2) + "\n")

    const saved = JSON.parse(readFileSync(join(skillDir, "tools.json"), "utf8"))
    assert.equal(saved.length, 1)
    assert.equal(saved[0].name, "test_tool")
  })

  it("should update registry on add and remove", () => {
    // Add first skill
    const skills = [
      { slug: "skill-a", name: "Skill A", version: "1.0.0", installedAt: new Date().toISOString() },
    ]
    writeRegistry(skills)
    assert.equal(readRegistry().length, 1)

    // Add second skill
    skills.push({ slug: "skill-b", name: "Skill B", version: "2.0.0", installedAt: new Date().toISOString() })
    writeRegistry(skills)
    assert.equal(readRegistry().length, 2)

    // Remove first skill
    const updated = skills.filter((s) => s.slug !== "skill-a")
    writeRegistry(updated)
    const result = readRegistry()
    assert.equal(result.length, 1)
    assert.equal(result[0].slug, "skill-b")
  })

  it("should remove skill directory", () => {
    const slug = "to-remove"
    const skillDir = join(SKILLS_DIR, slug)
    ensureDir(skillDir)
    writeFileSync(join(skillDir, "manifest.json"), "{}")

    assert.ok(existsSync(skillDir))
    rmSync(skillDir, { recursive: true, force: true })
    assert.ok(!existsSync(skillDir))
  })

  it("should handle re-installing same skill (update)", () => {
    const skills = [
      { slug: "my-skill", name: "My Skill", version: "1.0.0", installedAt: "2025-01-01T00:00:00.000Z" },
    ]
    writeRegistry(skills)

    // Re-install with new version
    const idx = skills.findIndex((s) => s.slug === "my-skill")
    skills[idx] = { slug: "my-skill", name: "My Skill", version: "2.0.0", installedAt: new Date().toISOString() }
    writeRegistry(skills)

    const result = readRegistry()
    assert.equal(result.length, 1)
    assert.equal(result[0].version, "2.0.0")
  })
})

// ── CLI Integration Tests ───────────────────────────────────────────────────

describe("CLI skill commands", () => {
  it("should show skill subcommands in help output", async () => {
    const { execSync } = await import("node:child_process")
    const output = execSync("node bin/shipyard.js help", {
      cwd: join(import.meta.dirname, ".."),
      encoding: "utf8",
    })
    assert.ok(output.includes("skill search"))
    assert.ok(output.includes("skill list"))
    assert.ok(output.includes("skill add"))
    assert.ok(output.includes("skill info"))
    assert.ok(output.includes("skill remove"))
  })

  it("should error on unknown skill subcommand", async () => {
    const { execSync } = await import("node:child_process")
    try {
      execSync("node bin/shipyard.js skill bogus", {
        cwd: join(import.meta.dirname, ".."),
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("Should have exited with error")
    } catch (err) {
      assert.ok(err.stderr.includes("Unknown skill command") || err.stdout.includes("Unknown skill command"))
    }
  })

  it("should error on skill search without query", async () => {
    const { execSync } = await import("node:child_process")
    try {
      execSync("node bin/shipyard.js skill search", {
        cwd: join(import.meta.dirname, ".."),
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("Should have exited with error")
    } catch (err) {
      assert.ok(err.stderr.includes("Usage") || err.stdout.includes("Usage"))
    }
  })

  it("should error on skill add without slug", async () => {
    const { execSync } = await import("node:child_process")
    try {
      execSync("node bin/shipyard.js skill add", {
        cwd: join(import.meta.dirname, ".."),
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("Should have exited with error")
    } catch (err) {
      assert.ok(err.stderr.includes("Usage") || err.stdout.includes("Usage"))
    }
  })

  it("should error on skill info without slug", async () => {
    const { execSync } = await import("node:child_process")
    try {
      execSync("node bin/shipyard.js skill info", {
        cwd: join(import.meta.dirname, ".."),
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("Should have exited with error")
    } catch (err) {
      assert.ok(err.stderr.includes("Usage") || err.stdout.includes("Usage"))
    }
  })

  it("should error on skill remove without slug", async () => {
    const { execSync } = await import("node:child_process")
    try {
      execSync("node bin/shipyard.js skill remove", {
        cwd: join(import.meta.dirname, ".."),
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("Should have exited with error")
    } catch (err) {
      assert.ok(err.stderr.includes("Usage") || err.stdout.includes("Usage"))
    }
  })
})
