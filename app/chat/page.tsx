"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useChat, type UIMessage } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ChevronDown, RotateCcw } from "lucide-react"

interface ConversationSummary {
  id: string
  title: string
  agent: string
  updatedAt: string
  latestPreview: string
}

interface ConversationDetail extends ConversationSummary {
  messages: Array<{
    id: string
    role: "user" | "assistant" | "agent"
    text: string
    agent: string
    timestamp: number
  }>
}

interface AgentDef {
  id: string
  name: string
  emoji: string
  accent: string
  description: string
}

const AGENTS: AgentDef[] = [
  { id: "vic", name: "Vic", emoji: "🦞", accent: "#7c3aed", description: "Chief of Staff" },
  { id: "scout", name: "Scout", emoji: "🔭", accent: "#06b6d4", description: "Market Intel" },
  { id: "builder", name: "Builder", emoji: "⚡", accent: "#10b981", description: "Full-Stack Dev" },
  { id: "baron", name: "Baron", emoji: "🏦", accent: "#ec4899", description: "The Banker" },
  { id: "deal-flow", name: "Deal Flow", emoji: "🤝", accent: "#f59e0b", description: "Partnership Radar" },
]

function relativeTime(value: string | number): string {
  const date = typeof value === "number" ? new Date(value) : new Date(value)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function toInitialMessages(detail: ConversationDetail | null): UIMessage[] {
  if (!detail) return []
  return detail.messages.map((message) => ({
    id: message.id,
    role: message.role === "agent" ? "assistant" : message.role,
    parts: [{ type: "text", text: message.text }],
  }))
}

function getText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n")
}

function ChatThread({
  conversationId,
  agent,
  initialMessages,
  onRefresh,
}: {
  conversationId: string
  agent: AgentDef
  initialMessages: UIMessage[]
  onRefresh: () => Promise<void>
}) {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, setMessages } = useChat({
    id: `chat-${conversationId}-${agent.id}`,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/stream",
      body: { conversationId, agent: agent.id },
    }),
    onFinish: async () => {
      await onRefresh()
    },
  })

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages, setMessages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const text = input
    setInput("")
    await sendMessage({ text })
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Start a conversation with {agent.name}.
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user"
            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    isUser
                      ? {
                          backgroundColor: `${agent.accent}20`,
                          border: `1px solid ${agent.accent}40`,
                          color: "#e4e4e7",
                        }
                      : {
                          backgroundColor: "#111118",
                          border: "1px solid #1a1a2e",
                          color: "#e4e4e7",
                        }
                  }
                >
                  <p className="mb-1 text-[11px] uppercase tracking-wide" style={{ color: isUser ? agent.accent : "#71717a" }}>
                    {isUser ? "You" : `${agent.emoji} ${agent.name}`}
                  </p>
                  <p className="whitespace-pre-wrap">{getText(message)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-zinc-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Send a message to ${agent.name}...`}
            rows={3}
            className="min-h-[84px] flex-1 rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
          />
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={status !== "ready" || !input.trim()}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 disabled:opacity-50"
            >
              {status === "submitted" || status === "streaming" ? "Thinking..." : "Send"}
            </button>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-xl border border-zinc-800 bg-[#0a0a0f] px-4 py-3 text-xs font-medium text-zinc-400"
            >
              Clear view
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedId = searchParams.get("id") ?? "main-chat"
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState(requestedId)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentDef>(AGENTS[0])

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations", { cache: "no-store" })
    const data = (await res.json()) as ConversationSummary[]
    const list = Array.isArray(data) ? data : []
    setConversations(list)
    if (requestedId && list.some((conversation) => conversation.id === requestedId)) {
      setSelectedId(requestedId)
    } else if (!list.some((conversation) => conversation.id === selectedId)) {
      setSelectedId(list[0]?.id ?? "main-chat")
    }
  }, [requestedId, selectedId])

  const fetchDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" })
    if (!res.ok) return
    const data = (await res.json()) as ConversationDetail
    setDetail(data)
    const matchingAgent = AGENTS.find((agent) => agent.id === data.agent)
    if (matchingAgent) setSelectedAgent(matchingAgent)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations().catch(() => null)
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchConversations])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (requestedId !== selectedId) {
        const next = new URLSearchParams(searchParams.toString())
        next.set("id", selectedId)
        router.replace(`/chat?${next.toString()}`)
      }
      fetchDetail(selectedId).catch(() => null)
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchDetail, requestedId, router, searchParams, selectedId])

  const initialMessages = useMemo(() => toInitialMessages(detail), [detail])

  const conversationOptions = conversations.filter((conversation) => conversation.id === "main-chat" || conversation.id.startsWith("task-"))

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]" style={{ height: "calc(100vh - 3rem)" }}>
      <section className="rounded-2xl border border-zinc-800 bg-[#111118] flex flex-col min-h-0">
        <div className="border-b border-zinc-800 p-4">
          <h1 className="text-xl font-semibold text-white">Chat</h1>
          <p className="mt-1 text-xs text-zinc-500">Vercel AI SDK chat UI on top of canonical conversations</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-2">
          {conversationOptions.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedId(conversation.id)}
              className="w-full rounded-xl border px-3 py-3 text-left"
              style={{
                backgroundColor: conversation.id === selectedId ? "rgba(34,211,238,0.08)" : "#0a0a0f",
                borderColor: conversation.id === selectedId ? "rgba(34,211,238,0.25)" : "#1f1f2f",
              }}
            >
              <p className="text-sm font-medium text-white">{conversation.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{conversation.agent} • {relativeTime(conversation.updatedAt)}</p>
              <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{conversation.latestPreview || "No messages yet"}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111118] flex flex-col min-h-0">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{detail?.title ?? "Chat"}</h2>
            <p className="mt-1 text-xs text-zinc-500">Conversation-first agent chat with streaming responses</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDetail(selectedId).catch(() => null)}
              className="flex items-center gap-1.5 rounded-lg bg-[#0a0a0f] px-3 py-2 text-xs font-medium text-zinc-400"
            >
              <RotateCcw size={12} /> Refresh
            </button>
            <div className="relative">
              <button
                onClick={() => setAgentMenuOpen((open) => !open)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: "#0a0a0f", border: `1px solid ${selectedAgent.accent}40` }}
              >
                <span className="text-base">{selectedAgent.emoji}</span>
                <span style={{ color: selectedAgent.accent }}>{selectedAgent.name}</span>
                <ChevronDown size={12} className="ml-auto" style={{ color: "#52525b" }} />
              </button>
              {agentMenuOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-xl border border-[#1a1a2e] bg-[#111118] shadow-xl">
                  {AGENTS.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent)
                        setAgentMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-white/5 text-left"
                    >
                      <span>{agent.emoji}</span>
                      <div>
                        <p className="font-medium" style={{ color: agent.accent }}>{agent.name}</p>
                        <p className="text-[11px] text-zinc-600">{agent.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ChatThread
          key={`${selectedId}-${selectedAgent.id}-${detail?.messages.length ?? 0}`}
          conversationId={selectedId}
          agent={selectedAgent}
          initialMessages={initialMessages}
          onRefresh={async () => {
            await fetchConversations()
            await fetchDetail(selectedId)
          }}
        />
      </section>
    </div>
  )
}
