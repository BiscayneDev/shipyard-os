<div align="center">
  <h1>⚓ Shipyard OS</h1>
  <p><strong>The open-source Agent OS for solo founders.</strong></p>
  <p>Connect your AI agents. Manage your work. Run your company from one dashboard.</p>

  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square" />
  <img src="https://img.shields.io/badge/OpenClaw-powered-7c3aed?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" />
</div>

---

## What is this?

I was running deals, shipping code, managing research, and monitoring a crypto portfolio — all while working full-time at MoonPay. I needed a way to see everything in one place and have AI agents actually *do* things, not just answer questions.

So I built Shipyard OS.

It's a local-first command center that connects to your AI agent team via [OpenClaw](https://openclaw.ai). Drag a task to "In Progress" — your agents pick it up and execute. No more jumping between Telegram, GitHub, Notion, and your terminal.

Think Jarvis. But for real.

---

## Features

- **🗂 Kanban Task Board** — drag tasks to activate agents. Agents move tasks to Done when they finish.
- **🤖 Agent Team** — Chief of Staff, Scout (research), Builder (engineering), Deal Flow (partnerships), Baron (treasury)
- **💬 Agent Chat** — talk to your agents directly from the dashboard
- **📬 Inbox** — important unread emails surfaced automatically (via Gmail)
- **📅 Calendar** — upcoming events at a glance
- **📊 Projects** — CI status, open PRs, deploy health across all your repos
- **🧠 Memory** — browse your agent's memory and daily notes
- **💰 Costs** — real token usage and spend via Anthropic Admin API
- **🔔 Toasts** — real-time notifications when agents complete work

---

## How it works

```
You drag a task to "In Progress"
        ↓
Shipyard OS fires an agent turn into your OpenClaw session
        ↓
Your Chief of Staff reads the task and delegates to the right agent
        ↓
Agent executes → task moves to Done → toast fires → activity logged
```

No polling. No manual follow-up. The board reflects reality.

---

## Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Tailwind CSS** (dark theme)
- **[OpenClaw](https://openclaw.ai)** — agent runtime + gateway
- Local JSON for task storage (no database required)

---

## Getting Started

### Prerequisites

- [OpenClaw](https://openclaw.ai) installed and running
- Node.js 18+

### Install & run

```bash
git clone https://github.com/BiscayneDev/shipyard-os
cd shipyard-os
npm install
npm run dev
```

Open [http://localhost:3000/setup](http://localhost:3000/setup) — the setup wizard walks you through everything.

---

## Setup Wizard

The first-run wizard connects Shipyard OS to your OpenClaw instance in a few steps:

1. **OpenClaw** — paste your gateway URL + token (`openclaw gateway status` to find these)
2. **Delivery channel** — where agents reach you (Telegram, Discord, Signal, WhatsApp)
3. **Workspace** — path to your agent files (`~/clawd` by default)
4. **Identity** — your name and your assistant's name
5. **API Keys** — optional Anthropic Admin key for real cost tracking

---

## Agent Setup

Shipyard OS works with any OpenClaw agent configuration. Each agent is a markdown identity file in your workspace:

```
~/clawd/
  SOUL.md                ← who your assistant is
  MEMORY.md              ← long-term memory
  agents/
    scout/SCOUT.md       ← market intelligence
    builder/BUILDER.md   ← engineering
    deal-flow/DEAL_FLOW.md
    baron/BARON.md       ← treasury
```

---

## Roadmap

- [ ] Agent marketplace — share and install agent identities
- [ ] Multi-workspace support
- [ ] Mobile app
- [ ] Goal → Task progress tracking

---

## Built by

[Halsey Huth](https://twitter.com/halseyh) — Strategic Partnerships at MoonPay, building in public.

Powered by [OpenClaw](https://openclaw.ai).

---

<div align="center">
  <sub>If you build something cool with this, let me know.</sub>
</div>
