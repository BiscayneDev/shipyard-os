import type { AlertRecord } from "@/lib/alerts"
import type { ConversationEvent, ConversationMessage, ConversationRun, ConversationStatus } from "@/lib/conversations"
import type { Task } from "@/lib/tasks"

export interface ConversationSummaryInput {
  id: string
  title: string
  agent: string
  status: ConversationStatus
  latestPreview?: string
  messages: ConversationMessage[]
  runs: ConversationRun[]
  events: ConversationEvent[]
}

export interface ProjectSummaryInput {
  project: {
    name: string
    latestRun: {
      status: string
      conclusion: string | null
      name: string
      url: string
    } | null
    openPRs: Array<{
      number: number
      title: string
      url: string
    }>
  }
  relatedTasks: Task[]
  relatedAlerts: AlertRecord[]
  relatedConversations: Array<{
    id: string
    title: string
    status: ConversationStatus
    latestPreview: string
    updatedAt: string
    runCount: number
  }>
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function clip(text: string, limit: number): string {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}…`
}

function compareByNewest<T>(getValue: (item: T) => string | number): (left: T, right: T) => number {
  return (left, right) => {
    const leftValue = new Date(getValue(left)).getTime()
    const rightValue = new Date(getValue(right)).getTime()

    if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) {
      return String(getValue(right)).localeCompare(String(getValue(left)))
    }

    return rightValue - leftValue
  }
}

function latestRunSummary(runs: ConversationRun[]): string | null {
  if (runs.length === 0) return null
  const latestRun = runs.slice().sort(compareByNewest((run) => run.startedAt))[0]
  const suffix = latestRun.error?.trim() ? ` (${latestRun.error.trim()})` : ""
  return `Latest run ${latestRun.status} on ${latestRun.runtime}${suffix}`
}

export function summarizeConversation(input: ConversationSummaryInput): string {
  const lines = [
    `Title: ${input.title}`,
    `Status: ${input.status}`,
    `Counts: ${formatCount(input.messages.length, "message")}, ${formatCount(input.runs.length, "run")}, ${formatCount(input.events.length, "event")}`,
  ]

  const recentMessages = input.messages
    .slice()
    .sort(compareByNewest((message) => message.timestamp))
    .filter((message) => Boolean(message.text.trim()))
    .slice(0, 3)
    .map((message) => `${message.role}: ${clip(message.text, 160)}`)

  lines.push(`Recent messages: ${recentMessages.length > 0 ? recentMessages.join(" | ") : "none"}`)

  const recentEvents = input.events
    .slice()
    .sort(compareByNewest((event) => event.timestamp))
    .filter((event) => Boolean(event.summary.trim()))
    .slice(0, 3)
    .map((event) => `${event.type}: ${clip(event.summary, 160)}`)

  lines.push(`Recent events: ${recentEvents.length > 0 ? recentEvents.join(" | ") : "none"}`)

  const runLine = latestRunSummary(input.runs)
  if (runLine) {
    lines.push(runLine)
  }

  return lines.join("\n")
}

export function summarizeProject(input: ProjectSummaryInput): string {
  const lines = [
    `${input.project.name} has ${formatCount(input.relatedTasks.length, "related task")}, ${formatCount(input.relatedConversations.length, "related conversation")}, and ${formatCount(input.relatedAlerts.length, "related alert")}.`,
  ]

  if (input.project.latestRun) {
    const conclusion = input.project.latestRun.conclusion ? `/${input.project.latestRun.conclusion}` : ""
    lines.push(`Latest CI run: ${input.project.latestRun.name} is ${input.project.latestRun.status}${conclusion}.`)
  } else {
    lines.push("Latest CI run: unavailable.")
  }

  if (input.project.openPRs.length > 0) {
    const titles = input.project.openPRs.slice(0, 2).map((pr) => `#${pr.number} ${pr.title}`)
    lines.push(`Open PRs: ${titles.join("; ")}${input.project.openPRs.length > 2 ? "; more pending" : ""}.`)
  }

  if (input.relatedTasks.length > 0) {
    const tasks = input.relatedTasks.slice(0, 3).map((task) => `${task.title} (${task.column})`)
    lines.push(`Task focus: ${tasks.join("; ")}.`)
  }

  const openAlerts = input.relatedAlerts.filter((alert) => alert.status !== "resolved")
  if (openAlerts.length > 0) {
    const alerts = openAlerts.slice(0, 2).map((alert) => `${alert.severity} ${alert.title}`)
    lines.push(`Open alerts: ${alerts.join("; ")}${openAlerts.length > 2 ? "; more open alerts" : ""}.`)
  }

  if (input.relatedConversations.length > 0) {
    const activeConversation = input.relatedConversations
      .slice()
      .sort(compareByNewest((conversation) => conversation.updatedAt))[0]
    const preview = activeConversation.latestPreview.trim()
    lines.push(
      `Most recent conversation: ${activeConversation.title} is ${activeConversation.status} with ${formatCount(activeConversation.runCount, "run")}${preview ? `; latest update: ${preview.slice(0, 120)}${preview.length > 120 ? "…" : ""}` : ""}.`
    )
  }

  return lines.join(" ")
}
