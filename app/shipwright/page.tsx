import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Code2, Layers3, Sparkles, Wallet, Zap } from "lucide-react"

export const metadata: Metadata = {
  title: "Shipwright | Shipyard",
  description: "Turn any API spec into agent-ready CLI and MCP tooling.",
  openGraph: {
    title: "Shipwright | Shipyard",
    description: "Turn any API spec into agent-ready CLI and MCP tooling.",
    url: "/shipwright",
    siteName: "Shipyard OS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shipwright | Shipyard",
    description: "Turn any API spec into agent-ready CLI and MCP tooling.",
  },
}

const capabilities = [
  {
    icon: Code2,
    title: "Generate a CLI",
    description: "Shipwright turns OpenAPI-backed services into a usable Go-based command-line tool.",
  },
  {
    icon: Layers3,
    title: "Generate an MCP server",
    description: "Expose the same API as agent-ready tooling your models can call directly.",
  },
  {
    icon: Wallet,
    title: "Wire in Buoy later",
    description: "Add x402 payment gating when the API needs metered, agent-paid access.",
  },
  {
    icon: Zap,
    title: "Stay local and fast",
    description: "Use a SQLite mirror for offline search, compact state, and token-efficient workflows.",
  },
]

const steps = [
  {
    title: "Point Shipwright at an API",
    body: "Give it an OpenAPI spec or a documented service and let the builder inspect the surface area.",
  },
  {
    title: "Generate the tooling",
    body: "Shipwright creates the CLI and MCP entrypoints so agents can operate the API without bespoke glue code.",
  },
  {
    title: "Ship it inside Shipyard",
    body: "Use the result in the broader stack — pair it with Shipyard OS, Buoy, Dock, and Fleet as needed.",
  },
]

const benefits = [
  "No hand-written wrappers for every API",
  "One command from spec to useful tooling",
  "MCP-ready by default for agent workflows",
  "SQLite mirror for local state and recall",
  "Buoy-compatible if you want payment gating",
]

export default function ShipwrightPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 lg:px-6 lg:py-10">
      <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-cyan-300">
            <Sparkles size={12} />
            CLI + MCP generation
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              From API spec to agent-ready tooling
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-zinc-400">
              Turn any OpenAPI-backed service into a CLI and MCP server your agents can actually use — with Shipwright inside the main Shipyard stack.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="#generate"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"
            >
              Generate Your CLI
              <ArrowRight size={16} />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-cyan-500/30 hover:text-cyan-200"
            >
              See How It Works
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-[#111118] p-4">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />
                <p className="text-sm leading-6 text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-[#111118] p-6 shadow-[0_0_30px_rgba(124,58,237,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">What Shipwright does</p>
              <p className="mt-2 text-sm text-zinc-300">A builder layer for the Shipyard ecosystem</p>
            </div>
            <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
              Live under Shipyard
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {[
              "Detect the API surface",
              "Generate CLI and MCP tooling",
              "Mirror state locally in SQLite",
              "Plug into Buoy when you want payments",
            ].map((line) => (
              <div key={line} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                {line}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Example flow</p>
            <pre className="mt-3 overflow-x-auto text-xs leading-6 text-zinc-300">
              {"# 1. List an API\n# 2. Trigger Shipwright\n# 3. Use the generated CLI + MCP server\n\ncurl -X POST https://openshipyard.xyz/api/v1/buoy/generate-cli \\\n  -H Authorization: Bearer *** \\\n  -H Content-Type: application/json \\\n  -d '{ \"listing_id\": \"your-listing-uuid\" }'"}
            </pre>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">How it works</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Three steps from spec to ship</h2>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
            Back to Shipyard OS →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-zinc-800 bg-[#111118] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-600">0{index + 1}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="rounded-3xl border border-zinc-800 bg-[#111118] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Capabilities</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Built for agent-native use</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                <Icon className="text-violet-300" size={20} />
                <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="generate" className="rounded-3xl border border-violet-500/20 bg-[linear-gradient(180deg,rgba(124,58,237,0.12),rgba(17,17,24,1))] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Why it matters</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Less glue, more capability</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
            Shipwright makes the wrapper layer disappear. The point is not to add another abstraction; it’s to turn a raw API into something agents can discover, call, and keep using without bespoke work every time.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              "Faster path from API spec to usable tooling",
              "A shared surface for humans and agents",
              "A natural bridge into Buoy, Dock, Fleet, and Shipyard OS",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-200">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-violet-400/30 hover:text-white"
            >
              Open Shipyard OS
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Explore the stack
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
