"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

// ── Agent definitions ──────────────────────────────────────────────────────

const AGENTS = [
  { emoji: "🦞", name: "Vic", role: "Chief of Staff", color: "#7c3aed" },
  { emoji: "🔭", name: "Scout", role: "Market Intelligence", color: "#06b6d4" },
  { emoji: "⚡", name: "Builder", role: "Engineering", color: "#10b981" },
  { emoji: "🤝", name: "Deal Flow", role: "Partnerships", color: "#f59e0b" },
  { emoji: "🏦", name: "Baron", role: "Treasury", color: "#ec4899" },
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
        }),
      })
      goTo(5)
    } catch {
      // Still proceed
      goTo(5)
    } finally {
      setSaving(false)
    }
  }

  const envConfig = [
    `OPENCLAW_GATEWAY_URL=${state.gatewayUrl}`,
    `OPENCLAW_GATEWAY_TOKEN=${state.gatewayToken}`,
    `AGENT_DELIVERY_TARGET=${state.deliveryTarget}`,
    `AGENT_DELIVERY_CHANNEL=${state.deliveryChannel}`,
    `AGENT_WORKSPACE=${state.workspace}`,
    `NEXT_PUBLIC_MC_URL=http://localhost:3000`,
  ].join("\n")

  const maskedToken = state.gatewayToken
    ? state.gatewayToken.slice(0, 4) + "•".repeat(Math.max(0, state.gatewayToken.length - 4))
    : "••••••••••••••••••••"

  const envConfigMasked = [
    `OPENCLAW_GATEWAY_URL=${state.gatewayUrl}`,
    `OPENCLAW_GATEWAY_TOKEN=${showEnvToken ? state.gatewayToken : maskedToken}`,
    `AGENT_DELIVERY_TARGET=${state.deliveryTarget}`,
    `AGENT_DELIVERY_CHANNEL=${state.deliveryChannel}`,
    `AGENT_WORKSPACE=${state.workspace}`,
    `NEXT_PUBLIC_MC_URL=http://localhost:3000`,
  ].join("\n")

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        color: "#e4e4e7",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Progress dots — hidden on welcome and done */}
        {step > 0 && step < 5 && <ProgressDots step={step} total={6} />}

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
                Your AI-powered command center.
                <br />
                One dashboard. Five agents. Zero dropped balls.
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
                Meet your team →
              </button>

              {/* Agent cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                      backgroundColor: "#111118",
                      border: `1px solid ${agent.color}44`,
                      borderRadius: 10,
                      padding: "10px 16px",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{agent.emoji}</span>
                    <div>
                      <span style={{ fontWeight: 600, color: agent.color }}>{agent.name}</span>
                      <span style={{ color: "#71717a", marginLeft: 8, fontSize: 14 }}>
                        — {agent.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
                  onClick={saveAndFinish}
                  disabled={!canGoNextIdentity || saving}
                  style={primaryBtnStyle(!canGoNextIdentity || saving)}
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

          {/* ── Step 5: Done ─────────────────────────────────────────────── */}
          {step === 5 && (
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
