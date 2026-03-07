import { homedir } from "os"
import path from "path"
import { readFileSync } from "fs"

// ── Setup.json migration: warn if secrets are still in JSON ─────
let _setupTokenFallback = ""
try {
  const setupPath = path.join(process.cwd(), "data", "setup.json")
  const raw = readFileSync(setupPath, "utf-8")
  const setup = JSON.parse(raw) as Record<string, string>
  if (setup.gatewayToken) {
    console.warn(
      "[Shipyard OS] Gateway token found in data/setup.json — migrate to .env.local: OPENCLAW_GATEWAY_TOKEN=..."
    )
    _setupTokenFallback = setup.gatewayToken
  }
  if (setup.anthropicAdminKey) {
    console.warn(
      "[Shipyard OS] Anthropic admin key found in data/setup.json — migrate to .env.local: ANTHROPIC_ADMIN_KEY=..."
    )
  }
} catch {
  // No setup.json or not readable
}

// ── OpenClaw Gateway ─────────────────────────────────────────────
export const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789"
export const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || _setupTokenFallback

// ── Agent Delivery ───────────────────────────────────────────────
export const AGENT_DELIVERY_TARGET = process.env.AGENT_DELIVERY_TARGET ?? ""
export const AGENT_DELIVERY_CHANNEL = process.env.AGENT_DELIVERY_CHANNEL ?? "telegram"

// ── Workspace paths ──────────────────────────────────────────────
const workspaceRoot = process.env.AGENT_WORKSPACE
  ? path.resolve(process.env.AGENT_WORKSPACE)
  : path.join(homedir(), "clawd")

export const WORKSPACE = {
  root: workspaceRoot,
  memory: path.join(workspaceRoot, "memory"),
  memoryFile: path.join(workspaceRoot, "MEMORY.md"),
  agents: path.join(workspaceRoot, "agents"),
  scout: {
    reports: path.join(workspaceRoot, "agents", "scout", "reports"),
    latest: path.join(workspaceRoot, "agents", "scout", "reports", "latest.json"),
  },
  baron: {
    research: path.join(workspaceRoot, "agents", "baron", "research.md"),
  },
  builder: {
    doc: path.join(workspaceRoot, "agents", "builder", "BUILDER.md"),
  },
  dealFlow: {
    doc: path.join(workspaceRoot, "agents", "deal-flow", "DEAL_FLOW.md"),
  },
}

// ── Google ───────────────────────────────────────────────────────
export const GOG_ACCOUNT = process.env.GOG_ACCOUNT ?? ""

// ── Mission Control public URL ───────────────────────────────────
export const MC_URL =
  process.env.NEXT_PUBLIC_MC_URL ?? "http://localhost:3000"

// ── CLI paths ────────────────────────────────────────────────────
export const BIN = {
  openclaw: "/opt/homebrew/bin/openclaw",
  gog: "/opt/homebrew/bin/gog",
  gh: "/opt/homebrew/bin/gh",
  moonpay: "/opt/homebrew/bin/moonpay",
  node: "/opt/homebrew/bin/node",
  npm: "/opt/homebrew/bin/npm",
}
