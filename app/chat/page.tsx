"use client"

import { useChat } from "@ai-sdk/react"
import { Send, RotateCcw, MessageSquare } from "lucide-react"
import { useRef, useEffect, useState } from "react"

export default function ChatPage() {
  const { messages, sendMessage, status, setMessages } = useChat()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isLoading = status === "submitted" || status === "streaming"

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    sendMessage({ text: trimmed })
    setInput("")
  }

  function getMessageText(message: typeof messages[number]): string {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 3rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Chat with CEO</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Direct line to the top</p>
        </div>
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

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#27272a transparent" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(124, 58, 237, 0.15)" }}
            >
              <MessageSquare size={24} style={{ color: "#7c3aed" }} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-300">Start a conversation</p>
              <p className="text-xs text-zinc-600 max-w-sm">
                Ask about priorities, strategy, team updates, or anything on your mind.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {[
                "What should we focus on this week?",
                "How's the team doing?",
                "What are our top priorities?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage({ text: suggestion })}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10"
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
          </div>
        ) : (
          messages.map((message) => {
            const text = getMessageText(message)
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
                          backgroundColor: "rgba(124, 58, 237, 0.2)",
                          border: "1px solid rgba(124, 58, 237, 0.3)",
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
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: "#7c3aed" }}>
                      CEO
                    </p>
                  )}
                  <div className="whitespace-pre-wrap">{text}</div>
                </div>
              </div>
            )
          })
        )}

        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
            >
              <p className="text-[10px] font-semibold mb-1.5" style={{ color: "#7c3aed" }}>
                CEO
              </p>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#7c3aed", animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#7c3aed", animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#7c3aed", animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-4 mb-2">
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ backgroundColor: "#111118", border: "1px solid #1a1a2e" }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message CEO..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-lg transition-colors disabled:opacity-30 hover:bg-white/10"
            style={{ color: "#7c3aed" }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-zinc-700 mt-1.5 text-center">
          Powered by Claude Haiku 4.5 — fast & cost-effective
        </p>
      </form>
    </div>
  )
}
