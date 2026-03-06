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
- **🤖 Agent Team** — built-in support for Vic (Chief of Staff), Scout (research), Builder (engineering), Deal Flow (partnerships), Baron (treasury)
- **💬 Agent Chat** — talk to your agents directly from the dashboard
- **📬 Inbox** — important unread emails surfaced automatically (via Gmail)
- **📅 Calendar** — upcoming events at a glance
- **📊 Projects** — CI status, open PRs, deploy health across all your repos
- **🧠 Memory** — browse your agent's memory and daily notes
- **📚 Docs** — living knowledge base of agent reports and research
- **💰 Costs** — token usage and estimated spend by model
- **⚙️ Settings** — configure everything: agent budgets, cron schedules, connected services
- **🔔 Toasts** — real-time notifications when agents start and complete work

---

## How it works

```
You drag a task to "In Progress"
        ↓
Shipyard OS fires an agent turn into your OpenClaw session
        ↓
Vic (Chief of Staff) reads the task, enriches the brief, delegates to the right agent
        ↓
Builder/Scout/Baron executes the task
        ↓
Agent calls completion hooks → task moves to Done → toast fires → activity logged
```

No polling. No manual follow-up. The board reflects reality.

---

## Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Tailwind CSS** (dark theme, `#0a0a0f` bg)
- **[OpenClaw](https://openclaw.ai)** — agent runtime + gateway
- **Vercel KV** (optional) — persistent task storage across deploys
- Local JSON fallback for everything

---

## Getting Started

### Prerequisites

- [OpenClaw](https://openclaw.ai) installed and running (`openclaw gateway start`)
- Node.js 18+
- A Telegram account (or any channel OpenClaw supports)

### Install

```bash
git clone https://github.com/BiscayneDev/shipyard-os
cd shipyard-os
npm install
```

### Configure

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Your OpenClaw gateway (run: openclaw gateway status)
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here

# Where task activations get sent (your Telegram chat ID)
AGENT_DELIVERY_TARGET=your-telegram-chat-id
AGENT_DELIVERY_CHANNEL=telegram

# Your agent workspace (where your MEMORY.md, agent files live)
AGENT_WORKSPACE=~/clawd

# Public URL for agent completion hooks
NEXT_PUBLIC_MC_URL=http://localhost:3000
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Agent Setup

Shipyard OS works best with a configured agent team. Each agent is a markdown identity file in your workspace:

```
~/clawd/
  MEMORY.md              ← long-term memory
  agents/
    scout/SCOUT.md       ← market intelligence
    builder/BUILDER.md   ← engineering
    deal-flow/DEAL_FLOW.md ← partnerships
    baron/BARON.md       ← treasury
```

Sample agent files are in [`/agents`](/agents). Copy them to your workspace and customize.

---

## Deploying to Vercel

```bash
vercel --prod
```

Set your env vars in the Vercel dashboard. For persistent task storage, link a Vercel KV database (Dashboard → Storage → Create KV → Connect to Project).

Note: Some features (inbox, memory, crons) require a local OpenClaw instance and won't work on Vercel — they gracefully return empty state.

---

## Roadmap

- [ ] Setup wizard (first-run config UI)
- [ ] Agent marketplace (share/install agent identities)
- [ ] Multi-workspace support
- [ ] Mobile app
- [ ] Goal → Task progress tracking
- [ ] Public agent gallery

---

## Built by

[Halsey Huth](https://twitter.com/halseyh) — Strategic Partnerships at MoonPay, building in public.

Powered by [OpenClaw](https://openclaw.ai) — the open-source AI agent platform.

---

<div align="center">
  <sub>If you build something cool with this, let me know.</sub>
</div>
