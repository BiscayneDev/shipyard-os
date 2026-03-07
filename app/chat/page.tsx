"use client"

import { Send, RotateCcw, MessageSquare, ChevronDown } from "lucide-react"
import { useRef, useEffect, useState, useCallback } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  agent: string
  timestamp: number
}

interface AgentDef {
  id: string
  name: string
  emoji: string
  accent: string
  description: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const AGENTS: AgentDef[] = [
  { id: "vic", name: "Vic", emoji: "🦞", accent: "#7c3aed", description: "Chief of Staff" },
  { id: "scout", name: "Scout", emoji: "🔭", accent: "#06b6d4", description: "Market Intel" },
  { id: "builder", name: "Builder", emoji: "⚡", accent: "#10b981", description: "Full-Stack Dev" },
  { id: "baron", name: "Baron", emoji: "🏦", accent: "#ec4899", description: "The Banker" },
  { id: "deal-flow", name: "Deal Flow", emoji: "🤝", accent: "#f59e0b", description: "Partnership Radar" },
]

const SUGGESTIONS = [
  "What should we focus on this week?",
  "What's the latest on x402?",
  "How's the team doing?",
  "Any deals I should know about?",
]

// ── Chat Page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentDef>(AGENTS[0])
  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [runtimeName, setRuntimeName] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, isLoading])

  useEffect(() => {
    inputRef.current?.focus()
    // Check runtime mode
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d: { demoMode?: boolean; runtimeType?: string }) => {
        if (d.demoMode) setDemoMode(true)
        if (d.runtimeType) setRuntimeName(d.runtimeType)
      })
      .catch(() => null)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const agent = selectedAgent
    const prefix = agent.id !== "vic" ? `[@${agent.name}] ` : ""
    const fullMessage = prefix + text

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      agent: agent.id,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMessage }),
      })

      const data = await res.json() as { reply?: string; error?: string }
      const replyText = data.reply ?? data.error ?? "No response."

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: replyText,
        agent: agent.id,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: "Failed to reach agent runtime. Is your runtime running?",
        agent: agent.id,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, selectedAgent])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  const lastUserAgent = messages.length > 0
    ? AGENTS.find((a) => a.id === messages[messages.length - 1]?.agent) ?? selectedAgent
    : selectedAgent

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 3rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Chat</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {demoMode ? "Demo mode — connect a runtime to chat" : "Talk to your agents"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
              style={{ color: "#71717a" }}
            >
              <RotateCcw size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Agent Selector */}
      <div className="relative mb-3 shrink-0">
        <button
          onClick={() => setAgentMenuOpen(!agentMenuOpen)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: "#111118",
            border: `1px solid ${selectedAgent.accent}40`,
          }}
        >
          <span className="text-base">{selectedAgent.emoji}</span>
          <span style={{ color: selectedAgent.accent }}>{selectedAgent.name}</span>
          <span className="text-xs text-zinc-600">{selectedAgent.description}</span>
          <ChevronDown size={12} className="ml-auto" style={{ color: "#52525b" }} />
        </button>
        {agentMenuOpen && (
          <div
            className="absolute top-full left-0 mt-1 w-56 rounded-xl z-10 overflow-hidden shadow-xl"
            style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
          >
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => { setSelectedAgent(agent); setAgentMenuOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-white/5 text-left"
              >
                <span>{agent.emoji}</span>
                <div>
                  <p className="font-medium" style={{ color: agent.accent }}>{agent.name}</p>
                  <p className="text-[11px] text-zinc-600">{agent.description}</p>
                </div>
                {selectedAgent.id === agent.id && (
                  <span className="ml-auto text-[10px]" style={{ color: agent.accent }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#27272a transparent" }}
        onClick={() => setAgentMenuOpen(false)}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: demoMode ? "#f59e0b20" : `${selectedAgent.accent}20` }}
            >
              <MessageSquare size={24} style={{ color: demoMode ? "#f59e0b" : selectedAgent.accent }} />
            </div>
            {demoMode ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-300">
                  Chat requires an active agent runtime
                </p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  You&apos;re running in demo mode. Connect an agent runtime to chat with your agents.
                </p>
                <a
                  href="/settings"
                  className="inline-block mt-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b30" }}
                >
                  Connect Runtime →
                </a>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-300">
                    Start a conversation with {selectedAgent.name}
                  </p>
                  <p className="text-xs text-zinc-600 max-w-sm">
                    {runtimeName === "ollama"
                      ? `Messages are processed by your local model via Ollama.`
                      : `Messages route through your agent runtime to the active session.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10 disabled:opacity-40"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        border: "1px solid #1a1a2e",
                        color: "#a1a1aa",
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          messages.map((message) => {
            const agent = AGENTS.find((a) => a.id === message.agent) ?? AGENTS[0]
            return (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    message.role === "user"
                      ? {
                          backgroundColor: `${agent.accent}20`,
                          border: `1px solid ${agent.accent}40`,
                          color: "#e4e4e7",
                        }
                      : {
                          backgroundColor: "#111118",
                          border: "1px solid #1a1a2e",
                          color: "#d4d4d8",
                        }
                  }
                >
                  {message.role === "assistant" && (
                    <p className="text-[10px] font-semibold mb-1.5 flex items-center gap-1" style={{ color: agent.accent }}>
                      <span>{agent.emoji}</span>
                      <span>{agent.name}</span>
                    </p>
                  )}
                  <div className="whitespace-pre-wrap">{message.text}</div>
                </div>
              </div>
            )
          })
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
            >
              <p className="text-[10px] font-semibold mb-1.5 flex items-center gap-1" style={{ color: lastUserAgent.accent }}>
                <span>{lastUserAgent.emoji}</span>
                <span>{lastUserAgent.name}</span>
              </p>
              <div className="flex gap-1 items-center">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: lastUserAgent.accent, animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: lastUserAgent.accent, animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: lastUserAgent.accent, animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-4 mb-2 shrink-0">
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ backgroundColor: "#111118", border: `1px solid ${selectedAgent.accent}30` }}
        >
          <span className="text-base shrink-0">{selectedAgent.emoji}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${selectedAgent.name}...`}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-lg transition-colors disabled:opacity-30 hover:bg-white/10"
            style={{ color: selectedAgent.accent }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-zinc-700 mt-1.5 text-center">
          {runtimeName === "ollama"
            ? "Powered by Ollama — running on your local hardware"
            : "Messages route to your local agent sessions"}
        </p>
      </form>
    </div>
  )
}
