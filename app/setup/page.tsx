"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// ── Agent definitions ──────────────────────────────────────────────────────

const AGENTS = [
  { emoji: "🤖", name: "Chief of Staff", role: "Orchestrates your agent team", color: "#7c3aed" },
  { emoji: "🔭", name: "Researcher", role: "Market intelligence & signals", color: "#06b6d4" },
  { emoji: "⚡", name: "Engineer", role: "Builds and ships code", color: "#10b981" },
  { emoji: "🤝", name: "Deal Flow", role: "Partnerships & opportunities", color: "#f59e0b" },
  { emoji: "🏦", name: "Treasurer", role: "Wallet & financial ops", color: "#ec4899" },
]

// ── Types ─────────────────────────────────────────────────────────────────

interface SetupState {
  gatewayUrl: string
  gatewayToken: string
  gatewayVersion: string
  deliveryChannel: string
  deliveryTarget: string
  workspace: string
  userName: string
  assistantName: string
  anthropicAdminKey: string
}

interface ScanResult {
  ok: boolean
  found: string[]
  missing: string[]
}

// ── Progress dots ─────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: i < step ? "#7c3aed" : i === step ? "#a78bfa" : "#2a2a3a",
            transition: "background-color 0.3s",
          }}
        />
      ))}
    </div>
  )
}

// ── Step wrapper with animation ───────────────────────────────────────────

function StepWrapper({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {children}
    </div>
  )
}

// ── Main Wizard ───────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(true)
  const [agentsVisible, setAgentsVisible] = useState<boolean[]>(Array(5).fill(false))

  const [state, setState] = useState<SetupState>({
    gatewayUrl: "http://127.0.0.1:18789",
    gatewayToken: "",
    gatewayVersion: "",
    deliveryChannel: "telegram",
    deliveryTarget: "",
    workspace: "~/clawd",
    userName: "",
    assistantName: "Vic",
    anthropicAdminKey: "",
  })

  // Gateway test state
  const [gatewayTesting, setGatewayTesting] = useState(false)
  const [gatewayResult, setGatewayResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Delivery test state
  const [deliveryTesting, setDeliveryTesting] = useState(false)
  const [deliveryResult, setDeliveryResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Workspace scan state
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [workspaceSkipped, setWorkspaceSkipped] = useState(false)

  // Token visibility
  const [showToken, setShowToken] = useState(false)
  const [showAdminKey, setShowAdminKey] = useState(false)
  const [showEnvToken, setShowEnvToken] = useState(false)

  // Saving state
  const [saving, setSaving] = useState(false)

  // Animate agents on step 0
  useEffect(() => {
    if (step === 0) {
      AGENTS.forEach((_, i) => {
        setTimeout(() => {
          setAgentsVisible((prev) => {
            const next = [...prev]
            next[i] = true
            return next
          })
        }, 300 + i * 150)
      })
    }
  }, [step])

  function goTo(nextStep: number) {
    setVisible(false)
    setTimeout(() => {
      setStep(nextStep)
      setVisible(true)
    }, 200)
  }

  function next() {
    goTo(step + 1)
  }

  function back() {
    goTo(step - 1)
  }

  async function testGateway() {
    setGatewayTesting(true)
    setGatewayResult(null)
    try {
      const res = await fetch("/api/setup/test-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.gatewayUrl, token: state.gatewayToken }),
      })
      const data = await res.json() as { ok: boolean; version?: string; error?: string }
      if (data.ok) {
        setState((s) => ({ ...s, gatewayVersion: data.version || "1.0" }))
        setGatewayResult({ ok: true, message: `Connected — OpenClaw v${data.version || "1.0"}` })
      } else {
        setGatewayResult({ ok: false, message: data.error || "Connection failed" })
      }
    } catch {
      setGatewayResult({ ok: false, message: "Network error — check your URL" })
    } finally {
      setGatewayTesting(false)
    }
  }

  async function testDelivery() {
    setDeliveryTesting(true)
    setDeliveryResult(null)
    try {
      const res = await fetch("/api/setup/test-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: state.deliveryChannel,
          target: state.deliveryTarget,
          gatewayUrl: state.gatewayUrl,
          gatewayToken: state.gatewayToken,
        }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (data.ok) {
        setDeliveryResult({ ok: true, message: "Message sent!" })
      } else {
        setDeliveryResult({ ok: false, message: data.error || "Failed to send" })
      }
    } catch {
      setDeliveryResult({ ok: false, message: "Network error" })
    } finally {
      setDeliveryTesting(false)
    }
  }

  async function scanWorkspace() {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch("/api/setup/scan-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: state.workspace }),
      })
      const data = await res.json() as ScanResult
      setScanResult(data)
    } catch {
      setScanResult({ ok: false, found: [], missing: ["Failed to scan — check path"] })
    } finally {
      setScanning(false)
    }
  }

  async function saveAndFinish() {
    setSaving(true)
    try {
      await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: state.userName,
          assistantName: state.assistantName,
          gatewayUrl: state.gatewayUrl,
          gatewayToken: state.gatewayToken,
          deliveryTarget: state.deliveryTarget,
          deliveryChannel: state.deliveryChannel,
          workspace: state.workspace,
          anthropicAdminKey: state.anthropicAdminKey,
        }),
      })
      goTo(6)
    } catch {
      // Still proceed
      goTo(6)
    } finally {
      setSaving(false)
    }
  }

  const envLines = [
    `OPENCLAW_GATEWAY_URL=${state.gatewayUrl}`,
    `OPENCLAW_GATEWAY_TOKEN=${state.gatewayToken}`,
    `AGENT_DELIVERY_TARGET=${state.deliveryTarget}`,
    `AGENT_DELIVERY_CHANNEL=${state.deliveryChannel}`,
    `AGENT_WORKSPACE=${state.workspace}`,
    `NEXT_PUBLIC_MC_URL=http://localhost:3000`,
  ]
  if (state.anthropicAdminKey) {
    envLines.push(`ANTHROPIC_ADMIN_KEY=${state.anthropicAdminKey}`)
  }
  const envConfig = envLines.join("\n")

  const maskedToken = state.gatewayToken
    ? state.gatewayToken.slice(0, 4) + "•".repeat(Math.max(0, state.gatewayToken.length - 4))
    : "••••••••••••••••••••"

  const maskedAdminKey = state.anthropicAdminKey
    ? state.anthropicAdminKey.slice(0, 12) + "•".repeat(Math.max(0, state.anthropicAdminKey.length - 12))
    : ""

  const envMaskedLines = [
    `OPENCLAW_GATEWAY_URL=${state.gatewayUrl}`,
    `OPENCLAW_GATEWAY_TOKEN=${showEnvToken ? state.gatewayToken : maskedToken}`,
    `AGENT_DELIVERY_TARGET=${state.deliveryTarget}`,
    `AGENT_DELIVERY_CHANNEL=${state.deliveryChannel}`,
    `AGENT_WORKSPACE=${state.workspace}`,
    `NEXT_PUBLIC_MC_URL=http://localhost:3000`,
  ]
  if (state.anthropicAdminKey) {
    envMaskedLines.push(`ANTHROPIC_ADMIN_KEY=${showEnvToken ? state.anthropicAdminKey : maskedAdminKey}`)
  }
  const envConfigMasked = envMaskedLines.join("\n")

  async function copyEnv() {
    try {
      await navigator.clipboard.writeText(envConfig)
    } catch {
      // Fallback
    }
  }

  const canGoNextGateway = gatewayResult?.ok === true
  const canGoNextDelivery = deliveryResult?.ok === true
  const canGoNextWorkspace = scanResult !== null || workspaceSkipped
  const canGoNextIdentity = state.userName.trim().length > 0

  // ── Sailboat ─────────────────────────────────────────────────────────────

const SAIL_LINES = [
  { text: "       │╲", color: "#71717a" },
  { text: "      ╱│ ╲", color: "#a1a1aa" },
  { text: "     ╱ │  ╲", color: "rgba(103,232,249,0.6)" },
  { text: "    ╱  │   ╲", color: "rgba(34,211,238,0.7)" },
  { text: "   ╱   │    ╲", color: "rgba(34,211,238,0.9)" },
  { text: "  ▁▁▁▁▁▁▁▁▁▁▁▁", color: "#2dd4bf" },
  { text: "   ╲▁▁▁▁▁▁▁▁╱", color: "#14b8a6" },
]

const WAVE = "~≈∿~≈∿~≈∿~≈∿~≈∿~≈∿~≈∿~≈∿~≈∿~≈∿~≈∿~"
const WAVE_LAYERS = [
  { speed: 3, opacity: 0.5, color: "rgb(34 211 238)", delay: 0 },
  { speed: 4, opacity: 0.35, color: "rgb(45 212 191)", delay: 0.4 },
  { speed: 5, opacity: 0.2, color: "rgb(20 184 166)", delay: 0.8 },
]

function SailboatScene() {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", userSelect: "none", pointerEvents: "none",
    }}>
      {/* Deep background gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(8,30,40,0.8) 0%, transparent 100%)",
      }} />

      {/* Grid lines — subtle */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.035,
        backgroundImage: "linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      {/* Large ambient glow behind boat */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,211,238,0.07) 0%, rgba(13,148,136,0.04) 40%, transparent 70%)",
        animation: "pulse-glow 5s ease-in-out infinite",
        top: "50%", left: "50%", transform: "translate(-50%, -52%)",
      }} />

      {/* Horizon glow line */}
      <div style={{
        position: "absolute", top: "58%", left: "10%", right: "10%", height: 1,
        background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.15), rgba(45,212,191,0.25), rgba(34,211,238,0.15), transparent)",
      }} />

      {/* Top tagline */}
      <div style={{
        position: "absolute", top: "14%", textAlign: "center",
        fontFamily: "var(--font-geist-mono), monospace",
      }}>
        <p style={{ color: "rgba(34,211,238,0.25)", fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", margin: 0 }}>
          // launch your api into the agent economy
        </p>
      </div>

      {/* Sailboat — larger */}
      <div style={{
        animation: "boat-rock 5s ease-in-out infinite",
        transformOrigin: "bottom center",
        marginBottom: 4,
        filter: "drop-shadow(0 0 24px rgba(34,211,238,0.18))",
      }}>
        <pre style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 26, lineHeight: 1.2, margin: 0 }}>
          {SAIL_LINES.map((line, i) => (
            <span key={i} style={{ color: line.color, display: "block" }}>{line.text}</span>
          ))}
        </pre>
      </div>

      {/* Waves */}
      <div style={{ position: "relative", height: 36, width: 340, overflow: "hidden" }}>
        {WAVE_LAYERS.map((layer, i) => (
          <div key={i} style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            whiteSpace: "nowrap", fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 15, top: i * 11, opacity: layer.opacity, color: layer.color,
            animation: `wave-drift ${layer.speed}s ease-in-out infinite`,
            animationDelay: `${layer.delay}s`,
          }}>{WAVE}</div>
        ))}
      </div>

      {/* Stats / flavor text */}
      <div style={{
        position: "absolute", bottom: "18%", textAlign: "center",
        fontFamily: "var(--font-geist-mono), monospace", display: "flex", flexDirection: "column", gap: 6,
      }}>
        {[
          { label: "agents online", value: "∞" },
          { label: "tasks automated", value: "∞" },
          { label: "balls dropped", value: "0" },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(34,211,238,0.2)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</span>
            <span style={{ color: "rgba(34,211,238,0.45)", fontSize: 11, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Bottom label */}
      <div style={{
        position: "absolute", bottom: "8%", textAlign: "center",
        fontFamily: "var(--font-geist-mono), monospace",
      }}>
        <p style={{ color: "rgba(34,211,238,0.15)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
          shipyard os · powered by openclaw
        </p>
      </div>
    </div>
  )
}

// ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#0a0a0f", display: "flex",
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif", color: "#e4e4e7",
    }}>
      {/* ── Left panel: wizard ─────────────────────────────────────── */}
      <div style={{
        width: "100%", maxWidth: 580, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "3rem 3.5rem 3rem 4rem",
        flexShrink: 0, zIndex: 1,
      }}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: "rgba(17,17,24,0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 20,
        padding: "2.5rem",
        boxShadow: "0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset",
      }}>
        {/* Progress dots — hidden on welcome and done */}
        {step > 0 && step < 6 && <ProgressDots step={step} total={7} />}

        <StepWrapper visible={visible}>
          {/* ── Step 0: Welcome ──────────────────────────────────────────── */}
          {step === 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚓</div>
              <h1
                style={{
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  fontWeight: 700,
                  marginBottom: 12,
                  letterSpacing: "-0.02em",
                }}
              >
                Shipyard OS
              </h1>
              <p
                style={{
                  fontSize: 18,
                  color: "#a1a1aa",
                  lineHeight: 1.6,
                  marginBottom: 40,
                  maxWidth: 380,
                  margin: "0 auto 40px",
                }}
              >
                Your AI command center.
                <br />
                Bring your own agents. Run your company on autopilot.
              </p>
              <button
                onClick={next}
                style={{
                  backgroundColor: "#7c3aed",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "14px 32px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 48,
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6d28d9")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#7c3aed")}
              >
                Set Sail →
              </button>

              {/* Role cards — generic, not my specific agents */}
              <p style={{ fontSize: 12, color: "#52525b", marginBottom: 12, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Common agent roles
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {AGENTS.map((agent, i) => (
                  <div
                    key={agent.name}
                    style={{
                      opacity: agentsVisible[i] ? 1 : 0,
                      transform: agentsVisible[i] ? "translateY(0)" : "translateY(12px)",
                      transition: "opacity 0.3s ease, transform 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: `1px solid rgba(255,255,255,0.06)`,
                      borderLeft: `2px solid ${agent.color}66`,
                      borderRadius: 10,
                      padding: "10px 16px",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{agent.emoji}</span>
                    <div>
                      <span style={{ fontWeight: 600, color: "#e4e4e7", fontSize: 14 }}>{agent.name}</span>
                      <span style={{ color: "#52525b", marginLeft: 8, fontSize: 13 }}>
                        {agent.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#3f3f46", marginTop: 12, textAlign: "center" }}>
                You define the agents — Shipyard OS runs them.
              </p>
            </div>
          )}

          {/* ── Step 1: OpenClaw Connection ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Connect OpenClaw</h2>
              <p style={{ color: "#a1a1aa", marginBottom: 32, lineHeight: 1.6 }}>
                Shipyard OS runs on OpenClaw — your local AI agent runtime.
              </p>

              <label style={labelStyle}>Gateway URL</label>
              <input
                style={inputStyle}
                type="text"
                value={state.gatewayUrl}
                onChange={(e) => {
                  setState((s) => ({ ...s, gatewayUrl: e.target.value }))
                  setGatewayResult(null)
                }}
                placeholder="http://127.0.0.1:18789"
              />

              <label style={{ ...labelStyle, marginTop: 20 }}>Gateway Token</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 80 }}
                  type={showToken ? "text" : "password"}
                  value={state.gatewayToken}
                  onChange={(e) => {
                    setState((s) => ({ ...s, gatewayToken: e.target.value }))
                    setGatewayResult(null)
                  }}
                  placeholder="Your gateway token"
                />
                <button
                  onClick={() => setShowToken((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#71717a",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: "4px 8px",
                  }}
                >
                  {showToken ? "Hide" : "Show"}
                </button>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  onClick={testGateway}
                  disabled={gatewayTesting || !state.gatewayUrl}
                  style={secondaryBtnStyle(gatewayTesting || !state.gatewayUrl)}
                >
                  {gatewayTesting ? (
                    <>
                      <Spinner /> Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </button>
              </div>

              {gatewayResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: gatewayResult.ok ? "#052e16" : "#2d0a0a",
                    border: `1px solid ${gatewayResult.ok ? "#22c55e44" : "#ef444444"}`,
                    color: gatewayResult.ok ? "#22c55e" : "#ef4444",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {gatewayResult.ok ? "✓" : "✗"} {gatewayResult.message}
                </div>
              )}

              <p style={helpTextStyle}>
                Run <code style={codeStyle}>openclaw gateway status</code> to find your URL and
                token.
              </p>

              <div style={navRowStyle}>
                <button onClick={back} style={backBtnStyle}>
                  ← Back
                </button>
                <button
                  onClick={next}
                  disabled={!canGoNextGateway}
                  style={primaryBtnStyle(!canGoNextGateway)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Delivery Channel ─────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                Connect your channel
              </h2>
              <p style={{ color: "#a1a1aa", marginBottom: 32, lineHeight: 1.6 }}>
                When you activate a task, Shipyard OS sends it to your agent as a live turn.
                Where should it reach you?
              </p>

              <label style={labelStyle}>Channel</label>
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={state.deliveryChannel}
                onChange={(e) => {
                  setState((s) => ({ ...s, deliveryChannel: e.target.value }))
                  setDeliveryResult(null)
                }}
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="signal">Signal</option>
                <option value="whatsapp">WhatsApp</option>
              </select>

              <label style={{ ...labelStyle, marginTop: 20 }}>Chat ID / Target</label>
              <input
                style={inputStyle}
                type="text"
                value={state.deliveryTarget}
                onChange={(e) => {
                  setState((s) => ({ ...s, deliveryTarget: e.target.value }))
                  setDeliveryResult(null)
                }}
                placeholder={
                  state.deliveryChannel === "telegram"
                    ? "e.g. 264452755"
                    : state.deliveryChannel === "discord"
                    ? "e.g. #general or channel ID"
                    : "Target ID or number"
                }
              />

              <div style={{ marginTop: 24 }}>
                <button
                  onClick={testDelivery}
                  disabled={deliveryTesting || !state.deliveryTarget}
                  style={secondaryBtnStyle(deliveryTesting || !state.deliveryTarget)}
                >
                  {deliveryTesting ? (
                    <>
                      <Spinner /> Sending...
                    </>
                  ) : (
                    "Send Test Message"
                  )}
                </button>
              </div>

              {deliveryResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: deliveryResult.ok ? "#052e16" : "#2d0a0a",
                    border: `1px solid ${deliveryResult.ok ? "#22c55e44" : "#ef444444"}`,
                    color: deliveryResult.ok ? "#22c55e" : "#ef4444",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {deliveryResult.ok ? "✓" : "✗"} {deliveryResult.message}
                </div>
              )}

              {state.deliveryChannel === "telegram" && (
                <p style={helpTextStyle}>
                  For Telegram: message{" "}
                  <code style={codeStyle}>@userinfobot</code> to get your chat ID.
                </p>
              )}

              <div style={navRowStyle}>
                <button onClick={back} style={backBtnStyle}>
                  ← Back
                </button>
                <button
                  onClick={next}
                  disabled={!canGoNextDelivery}
                  style={primaryBtnStyle(!canGoNextDelivery)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Workspace ────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Agent Workspace</h2>
              <p style={{ color: "#a1a1aa", marginBottom: 32, lineHeight: 1.6 }}>
                Where do your agent files live? This is where Shipyard OS reads memory, Scout
                reports, and agent identities.
              </p>

              <label style={labelStyle}>Workspace path</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  type="text"
                  value={state.workspace}
                  onChange={(e) => {
                    setState((s) => ({ ...s, workspace: e.target.value }))
                    setScanResult(null)
                  }}
                  placeholder="~/clawd"
                />
                <button
                  onClick={scanWorkspace}
                  disabled={scanning || !state.workspace}
                  style={{
                    ...secondaryBtnStyle(scanning || !state.workspace),
                    whiteSpace: "nowrap",
                    minWidth: 80,
                  }}
                >
                  {scanning ? <Spinner /> : "Scan →"}
                </button>
              </div>

              {scanResult && (
                <div
                  style={{
                    marginTop: 20,
                    padding: "16px",
                    backgroundColor: "#111118",
                    border: "1px solid #2a2a3a",
                    borderRadius: 10,
                  }}
                >
                  {scanResult.found.map((item) => (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        color: "#22c55e",
                        fontSize: 14,
                      }}
                    >
                      <span>✓</span>
                      <span>{item} found</span>
                    </div>
                  ))}
                  {scanResult.missing.map((item) => (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        color: "#f59e0b",
                        fontSize: 14,
                      }}
                    >
                      <span>⚠</span>
                      <span>{item} not found — will use defaults</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={navRowStyle}>
                <button onClick={back} style={backBtnStyle}>
                  ← Back
                </button>
                <button
                  onClick={() => {
                    setWorkspaceSkipped(true)
                    next()
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#71717a",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "8px 12px",
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={next}
                  disabled={!canGoNextWorkspace}
                  style={primaryBtnStyle(!canGoNextWorkspace)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Identity ─────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Make it yours</h2>
              <p style={{ color: "#a1a1aa", marginBottom: 32, lineHeight: 1.6 }}>
                What should we call you?
              </p>

              <label style={labelStyle}>Your name</label>
              <input
                style={inputStyle}
                type="text"
                value={state.userName}
                onChange={(e) => setState((s) => ({ ...s, userName: e.target.value }))}
                placeholder='e.g. "Halsey"'
              />

              <label style={{ ...labelStyle, marginTop: 24 }}>Your assistant&apos;s name</label>
              <input
                style={inputStyle}
                type="text"
                value={state.assistantName}
                onChange={(e) => setState((s) => ({ ...s, assistantName: e.target.value }))}
                placeholder='e.g. "Jarvis", "Max", "Aria"'
              />

              <div style={navRowStyle}>
                <button onClick={back} style={backBtnStyle}>
                  ← Back
                </button>
                <button
                  onClick={next}
                  disabled={!canGoNextIdentity}
                  style={primaryBtnStyle(!canGoNextIdentity)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: API Keys ──────────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>API Keys</h2>
              <p style={{ color: "#a1a1aa", marginBottom: 32, lineHeight: 1.6 }}>
                Connect your AI provider for accurate cost tracking.
              </p>

              <label style={labelStyle}>Anthropic Admin Key</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 80 }}
                  type={showAdminKey ? "text" : "password"}
                  value={state.anthropicAdminKey}
                  onChange={(e) => setState((s) => ({ ...s, anthropicAdminKey: e.target.value }))}
                  placeholder="sk-ant-admin..."
                />
                <button
                  onClick={() => setShowAdminKey((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#71717a",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: "4px 8px",
                  }}
                >
                  {showAdminKey ? "Hide" : "Show"}
                </button>
              </div>

              <p style={helpTextStyle}>
                Optional. Get yours at{" "}
                <a
                  href="https://console.anthropic.com/settings/admin-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#a78bfa", textDecoration: "underline" }}
                >
                  console.anthropic.com/settings/admin-keys
                </a>
              </p>

              <div style={navRowStyle}>
                <button onClick={back} style={backBtnStyle}>
                  ← Back
                </button>
                <button
                  onClick={next}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#71717a",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: "8px 12px",
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={saveAndFinish}
                  disabled={saving}
                  style={primaryBtnStyle(saving)}
                >
                  {saving ? (
                    <>
                      <Spinner /> Saving...
                    </>
                  ) : (
                    "Finish →"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 6: Done ─────────────────────────────────────────────── */}
          {step === 6 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚓</div>
              <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>You&apos;re all set.</h2>
              <p style={{ color: "#a1a1aa", marginBottom: 36, fontSize: 16 }}>
                Your Shipyard OS is ready.
                {state.userName ? ` Welcome aboard, ${state.userName}.` : ""}
              </p>

              <p style={{ color: "#71717a", fontSize: 13, marginBottom: 12, textAlign: "left" }}>
                Here&apos;s your config — save this as <code style={codeStyle}>.env.local</code>:
              </p>

              {/* Env config box */}
              <div
                style={{
                  backgroundColor: "#0d0d17",
                  border: "1px solid #2a2a3a",
                  borderRadius: 10,
                  padding: "16px 20px",
                  textAlign: "left",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 13,
                  lineHeight: 1.8,
                  color: "#a1a1aa",
                  marginBottom: 16,
                  position: "relative",
                }}
              >
                {envConfigMasked.split("\n").map((line, i) => {
                  const [key, ...valParts] = line.split("=")
                  const val = valParts.join("=")
                  return (
                    <div key={i}>
                      <span style={{ color: "#7c3aed" }}>{key}</span>
                      <span style={{ color: "#71717a" }}>=</span>
                      <span style={{ color: "#e4e4e7" }}>{val}</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowEnvToken((v) => !v)}
                  style={{
                    background: "none",
                    border: "1px solid #2a2a3a",
                    borderRadius: 8,
                    padding: "8px 16px",
                    color: "#71717a",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {showEnvToken ? "Hide token" : "Show token"}
                </button>
                <button
                  onClick={copyEnv}
                  style={{
                    background: "none",
                    border: "1px solid #2a2a3a",
                    borderRadius: 8,
                    padding: "8px 16px",
                    color: "#a1a1aa",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Copy to clipboard
                </button>
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  ...primaryBtnStyle(false),
                  width: "100%",
                  fontSize: 16,
                  padding: "14px 32px",
                }}
              >
                Launch Shipyard OS →
              </button>
            </div>
          )}
        </StepWrapper>
      </div>
      </div>

      {/* ── Right panel: sailboat scene (hidden on mobile) ──────────── */}
      <div className="hidden lg:flex" style={{
        flex: 1, position: "relative", overflow: "hidden",
        borderLeft: "1px solid rgba(34,211,238,0.07)",
      }}>
        <SailboatScene />
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#a1a1aa",
  marginBottom: 8,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  backgroundColor: "#111118",
  border: "1px solid #2a2a3a",
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 15,
  color: "#e4e4e7",
  outline: "none",
  boxSizing: "border-box",
}

const helpTextStyle: React.CSSProperties = {
  marginTop: 16,
  fontSize: 13,
  color: "#52525b",
  lineHeight: 1.6,
}

const codeStyle: React.CSSProperties = {
  backgroundColor: "#1a1a2a",
  padding: "2px 6px",
  borderRadius: 4,
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: 12,
  color: "#a1a1aa",
}

const navRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 36,
  alignItems: "center",
  justifyContent: "flex-end",
}

const backBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#71717a",
  cursor: "pointer",
  fontSize: 15,
  padding: "10px 0",
  marginRight: "auto",
}

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    backgroundColor: disabled ? "#3f2f6a" : "#7c3aed",
    color: disabled ? "#6d6d8a" : "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 28px",
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "background-color 0.15s",
  }
}

function secondaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    backgroundColor: disabled ? "#111118" : "#1a1a2a",
    color: disabled ? "#4a4a5a" : "#a1a1aa",
    border: `1px solid ${disabled ? "#1a1a2a" : "#3a3a4a"}`,
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "background-color 0.15s",
  }
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  )
}
