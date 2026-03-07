#!/usr/bin/env node

import { execSync, spawn } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { resolve, basename } from "node:path"
import { createInterface } from "node:readline"

// ── Colors (no dependencies) ────────────────────────────────────────────────

const bold = (s) => `\x1b[1m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const cyan = (s) => `\x1b[36m${s}\x1b[0m`
const purple = (s) => `\x1b[35m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`

// ── Config ───────────────────────────────────────────────────────────────────

const REPO_URL = "https://github.com/BiscayneDev/shipyard-os.git"
const DEFAULT_DIR = "shipyard-os"

// ── Helpers ──────────────────────────────────────────────────────────────────

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: "pipe", ...opts })
    return true
  } catch {
    return false
  }
}

function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "pipe" })
    return true
  } catch {
    return false
  }
}

function spinner(text) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  let i = 0
  const id = setInterval(() => {
    process.stdout.write(`\r${purple(frames[i++ % frames.length])} ${text}`)
  }, 80)
  return {
    stop: (finalText) => {
      clearInterval(id)
      process.stdout.write(`\r${green("✓")} ${finalText}\n`)
    },
    fail: (finalText) => {
      clearInterval(id)
      process.stdout.write(`\r${red("✗")} ${finalText}\n`)
    },
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log()
  console.log(bold("  ⚓ create-shipyard-app"))
  console.log(dim("  The open-source Agent OS for solo founders"))
  console.log()

  // ── Parse args ──────────────────────────────────────────────────────────

  const args = process.argv.slice(2)
  const skipPrompts = args.includes("--yes") || args.includes("-y")
  let targetDir = args.find((a) => !a.startsWith("-")) || ""

  // ── Check prerequisites ─────────────────────────────────────────────────

  if (!hasCommand("git")) {
    console.log(red("  Error: git is required but not installed."))
    console.log(dim("  Install it from https://git-scm.com"))
    process.exit(1)
  }

  if (!hasCommand("node")) {
    console.log(red("  Error: Node.js is required but not installed."))
    console.log(dim("  Install Node.js 18+ from https://nodejs.org"))
    process.exit(1)
  }

  // ── Get project directory ───────────────────────────────────────────────

  if (!targetDir) {
    if (skipPrompts) {
      targetDir = DEFAULT_DIR
    } else {
      targetDir = await ask(
        `  ${cyan("?")} Project directory ${dim(`(${DEFAULT_DIR})`)}${cyan(":")} `
      )
      if (!targetDir) targetDir = DEFAULT_DIR
    }
  }

  const projectPath = resolve(process.cwd(), targetDir)
  const projectName = basename(projectPath)

  if (existsSync(projectPath)) {
    // Check if it's a non-empty directory
    const { readdirSync } = await import("node:fs")
    const contents = readdirSync(projectPath)
    if (contents.length > 0) {
      console.log(
        red(`  Error: Directory "${projectName}" already exists and is not empty.`)
      )
      process.exit(1)
    }
  }

  console.log()

  // ── Clone ───────────────────────────────────────────────────────────────

  const cloneSpinner = spinner("Cloning Shipyard OS...")
  const cloned = run(`git clone --depth 1 ${REPO_URL} "${projectPath}"`)
  if (!cloned) {
    cloneSpinner.fail("Failed to clone repository")
    console.log(dim(`  Try manually: git clone ${REPO_URL}`))
    process.exit(1)
  }
  cloneSpinner.stop(`Cloned into ${cyan(projectName)}`)

  // Remove .git so user starts fresh
  run(`rm -rf "${projectPath}/.git"`)
  run(`git init`, { cwd: projectPath })

  // ── Install dependencies ────────────────────────────────────────────────

  const installSpinner = spinner("Installing dependencies...")

  // Detect package manager
  let pm = "npm"
  if (hasCommand("pnpm")) pm = "pnpm"
  else if (hasCommand("yarn")) pm = "yarn"

  const installCmd = pm === "yarn" ? "yarn" : `${pm} install`
  const installed = run(installCmd, { cwd: projectPath })

  if (!installed) {
    installSpinner.fail("Failed to install dependencies")
    console.log(dim(`  cd ${projectName} && ${installCmd}`))
    process.exit(1)
  }
  installSpinner.stop(`Dependencies installed with ${cyan(pm)}`)

  // ── Done ────────────────────────────────────────────────────────────────

  console.log()
  console.log(green(bold("  ⚓ Shipyard OS is ready!")))
  console.log()
  console.log(`  ${dim("cd")} ${projectName}`)
  console.log(`  ${dim(pm === "yarn" ? "yarn" : `${pm} run`)} dev`)
  console.log()
  console.log(
    dim("  The setup wizard will open at http://localhost:3000")
  )
  console.log()

  // ── Auto-start dev server ───────────────────────────────────────────────

  if (!skipPrompts) {
    const start = await ask(`  ${cyan("?")} Start the dev server now? ${dim("(Y/n)")}${cyan(":")} `)
    if (!start || start.toLowerCase() === "y" || start.toLowerCase() === "yes") {
      console.log()
      console.log(dim("  Starting dev server..."))
      console.log()

      const devCmd = pm === "yarn" ? "yarn" : pm
      const devArgs = pm === "yarn" ? ["dev"] : ["run", "dev"]

      const child = spawn(devCmd, devArgs, {
        cwd: projectPath,
        stdio: "inherit",
      })

      // Open browser after a short delay
      setTimeout(() => {
        const openCmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open"
        run(`${openCmd} http://localhost:3000`)
      }, 3000)

      child.on("close", (code) => {
        process.exit(code || 0)
      })

      // Forward signals
      process.on("SIGINT", () => child.kill("SIGINT"))
      process.on("SIGTERM", () => child.kill("SIGTERM"))
      return
    }
  }

  console.log(dim("  Happy shipping! ⚓"))
  console.log()
}

main().catch((err) => {
  console.error(red(`  Error: ${err.message}`))
  process.exit(1)
})
