"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useChat, type UIMessage } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const FOLLOW_UPS = ["What needs my attention?", "Summarize today's brief", "What are the agents doing?"]

function getText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? (part.text as string) : ""))
    .join("\n")
}

export function openVic(prefill?: string) {
  window.dispatchEvent(new CustomEvent("vic:open", { detail: prefill }))
}

export function VicPanel() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat/stream",
      body: { conversationId: "vic-panel", agent: "vic" },
    }),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    const onOpen = (e: Event) => {
      setOpen(true)
      const prefill = (e as CustomEvent<string>).detail
      if (prefill && inputRef.current) {
        inputRef.current.value = prefill
      }
      setTimeout(() => inputRef.current?.focus(), 120)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("vic:open", onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("vic:open", onOpen)
    }
  }, [])

  const submit = useCallback(
    (text: string) => {
      const value = text.trim()
      if (!value || status === "submitted" || status === "streaming") return
      sendMessage({ text: value })
    },
    [sendMessage, status],
  )

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask Vic"
        className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-2xl text-lg transition-all duration-300 ${
          open ? "pointer-events-none scale-90 opacity-0" : "opacity-100 hover:scale-105"
        }`}
        style={{
          background: "linear-gradient(145deg, #d8ccf9, #a78bfa 60%, #8b5cf6)",
          color: "#0b0b10",
          boxShadow: "0 1px 0 rgba(255,255,255,.35) inset, 0 10px 32px rgba(139,92,246,.45)",
        }}
      >
        🦞
      </button>

      {/* Docked panel */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-screen w-full flex-col border-l transition-transform duration-300 sm:w-[408px]"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          backgroundColor: "#050507",
          borderColor: "#1c1c25",
        }}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: "#1c1c25" }}>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[15px]"
            style={{
              background: "linear-gradient(145deg, #a78bfa, #6366f1)",
              boxShadow: "0 0 18px rgba(139,92,246,.3), inset 0 1px 0 rgba(255,255,255,.25)",
            }}
          >
            🦞
          </div>
          <div>
            <p className="text-[13.5px] font-semibold leading-tight" style={{ letterSpacing: "-.004em" }}>
              Vic
            </p>
            <p
              className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]"
              style={{ color: "#6ee7b7" }}
            >
              chief of staff
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg px-2 py-1 text-sm transition-colors"
            style={{ color: "#62657a" }}
            aria-label="Close Vic"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {messages.length === 0 && (
            <div className="space-y-4 pt-6 text-center">
              <p className="font-serif text-[22px] italic" style={{ color: "#a2a5b8" }}>
                Ask Vic anything.
              </p>
              <p className="mx-auto max-w-[30ch] text-[12.5px]" style={{ color: "#62657a" }}>
                She can spawn agents, brief you on the fleet, and act on your rails — from anywhere in the OS.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {FOLLOW_UPS.map((f) => (
                  <button
                    key={f}
                    onClick={() => submit(f)}
                    className="rounded-full border px-3.5 py-1.5 text-[11.5px] font-normal transition-all"
                    style={{ borderColor: "#1c1c25", backgroundColor: "#0d0d12", color: "#62657a" }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) =>
            message.role === "user" ? (
              <div
                key={message.id}
                className="ml-auto max-w-[85%] rounded-[13px_13px_4px_13px] border px-3.5 py-2.5 text-[13px]"
                style={{ backgroundColor: "#17171f", borderColor: "#2a2a37", color: "#d4d7e3" }}
              >
                {getText(message)}
              </div>
            ) : (
              <div key={message.id} className="max-w-[95%] text-[13.5px] leading-[1.68]" style={{ color: "#ccd0de" }}>
                {getText(message)}
              </div>
            ),
          )}

          {(status === "submitted" || status === "streaming") && (
            <div className="flex items-center gap-2.5 px-1 py-1">
              <span
                className="inline-block h-4 w-4 rounded-full border-2"
                style={{ borderColor: "#2a2a37", borderTopColor: "#a78bfa", animation: "spin 0.9s linear infinite" }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "#62657a" }}>
                {status === "streaming" ? "thinking" : "connecting"}
              </span>
            </div>
          )}

          {error && (
            <p className="text-[12px]" style={{ color: "#f0a6c8" }}>
              Vic is unreachable right now — try again in a moment.
            </p>
          )}
        </div>

        <div className="border-t px-4 py-3.5" style={{ borderColor: "#1c1c25" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!inputRef.current) return
              submit(inputRef.current.value)
              inputRef.current.value = ""
            }}
            className="rounded-[14px] border p-3 transition-all focus-within:shadow-[0_0_0_3px_rgba(139,92,246,.1)]"
            style={{ backgroundColor: "#121218", borderColor: "#1c1c25" }}
          >
            <input
              ref={inputRef}
              placeholder="Message Vic — @ agent · / command"
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ color: "#e9eaf0" }}
            />
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="rounded-full border px-2.5 py-[3px] font-mono text-[10px]" style={{ borderColor: "#1c1c25", color: "#b9a8f7" }}>
                ◆ vic
              </span>
              <span className="rounded-full border px-2.5 py-[3px] font-mono text-[10px]" style={{ borderColor: "#1c1c25", color: "#62657a" }}>
                @
              </span>
              <span className="rounded-full border px-2.5 py-[3px] font-mono text-[10px]" style={{ borderColor: "#1c1c25", color: "#62657a" }}>
                /
              </span>
              <button
                type="submit"
                aria-label="Send"
                className="ml-auto flex h-[29px] w-[29px] items-center justify-center rounded-[9px] text-[13px] transition-transform hover:-translate-y-[1px]"
                style={{
                  background: "linear-gradient(135deg, #d8ccf9, #a78bfa)",
                  color: "#0b0b10",
                  boxShadow: "0 1px 0 rgba(255,255,255,.35) inset",
                }}
              >
                ↑
              </button>
            </div>
          </form>
          <p className="pt-2 text-center font-mono text-[10px]" style={{ color: "#565b70" }}>
            ⌘K toggles Vic anywhere
          </p>
        </div>
      </aside>
    </>
  )
}
