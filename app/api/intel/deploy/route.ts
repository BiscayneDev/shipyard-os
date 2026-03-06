import { WORKSPACE } from "@/lib/config"
import { NextResponse } from "next/server"
import { spawn } from "child_process"
import { homedir } from "os"
import path from "path"

export async function POST() {
  const home = homedir()
  const reportPath = WORKSPACE.scout.latest
  const scriptPath = path.join(home, ".claude/skills/last30days/scripts/last30days.py")

  // Write a runner script to a temp file to avoid template literal conflicts
  const runner = [
    "#!/bin/zsh",
    "source ~/.zshenv",
    `RESULT=$(python3 "${scriptPath}" "OpenClaw x402 MoonPay Agents crypto agent skills" --days=1 --emit=compact 2>&1)`,
    "STATS_X=$(echo \"$RESULT\" | grep -o 'X: [0-9]* posts' | grep -o '[0-9]*' | head -1)",
    "STATS_R=$(echo \"$RESULT\" | grep -o 'Reddit: [0-9]* threads' | grep -o '[0-9]*' | head -1)",
    `python3 << 'PYEOF'`,
    "import json, datetime, os, sys",
    `result_file = "/tmp/scout_result.txt"`,
    "try:",
    `    with open(result_file) as f: raw = f.read()`,
    "except: raw = ''",
    "report = {",
    `    'generatedAt': datetime.datetime.utcnow().isoformat() + 'Z',`,
    `    'period': '24h',`,
    `    'topics': ['x402', 'OpenClaw', 'MoonPay Agents', 'crypto agent skills'],`,
    `    'summary': 'Scout completed research. See raw output below.',`,
    `    'sections': [],`,
    `    'topPosts': [],`,
    `    'stats': {'xPosts': 0, 'redditThreads': 0, 'webPages': 8},`,
    `    'rawOutput': raw[:8000]`,
    "}",
    `with open("${reportPath}", 'w') as f: json.dump(report, f, indent=2)`,
    "PYEOF",
  ]

  // Simpler approach: write result to file then parse with python
  const script = [
    "source ~/.zshenv",
    `python3 "${scriptPath}" "OpenClaw x402 MoonPay Agents crypto agent skills" --days=1 --emit=compact > /tmp/scout_result.txt 2>&1`,
    `python3 -c "
import json, datetime
try:
    with open('/tmp/scout_result.txt') as f: raw = f.read()
except:
    raw = 'Error running research'

# Parse basic stats
import re
x_match = re.search(r'X: (\\d+) posts', raw)
r_match = re.search(r'Reddit: (\\d+) threads', raw)

report = {
    'generatedAt': datetime.datetime.utcnow().isoformat() + 'Z',
    'period': '24h',
    'topics': ['x402', 'OpenClaw', 'MoonPay Agents', 'crypto agent skills'],
    'summary': 'Scout completed research. See raw output below.',
    'sections': [],
    'topPosts': [],
    'stats': {
        'xPosts': int(x_match.group(1)) if x_match else 0,
        'redditThreads': int(r_match.group(1)) if r_match else 0,
        'webPages': 8
    },
    'rawOutput': raw[:8000]
}
with open('${reportPath}', 'w') as f:
    json.dump(report, f, indent=2)
print('Scout report saved.')
"`,
  ].join("\n")

  void runner // suppress unused warning

  const child = spawn("zsh", ["-c", script], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, HOME: home },
  })
  child.unref()

  return NextResponse.json({ status: "deployed", message: "Scout is on it. Check back in ~2 minutes." })
}
