export type Priority = "high" | "medium" | "low"
export type Column = "backlog" | "in-progress" | "in-review" | "done"
export type Agent = "vic" | "scout" | "deal-flow" | "builder" | "baron" | "unassigned"

export interface Task {
  id: string
  title: string
  description?: string
  column: Column
  priority: Priority
  assignee: Agent
  tags: string[]
  createdAt: string
  updatedAt: string
}

export const COLUMNS: { id: Column; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In Progress" },
  { id: "in-review", label: "In Review" },
  { id: "done", label: "Done" },
]

export const AGENT_EMOJI: Record<Agent, string> = {
  vic: "🦞",
  scout: "🔭",
  "deal-flow": "🤝",
  builder: "⚡",
  baron: "🏦",
  unassigned: "⚪",
}

export const AGENT_LABELS: Record<Agent, string> = {
  vic: "Vic",
  scout: "Scout",
  "deal-flow": "Deal Flow",
  builder: "Builder",
  baron: "Baron",
  unassigned: "Unassigned",
}

export const PRIORITY_CONFIG: Record<Priority, { color: string; border: string; label: string }> = {
  high: { color: "#ef4444", border: "#ef4444", label: "High" },
  medium: { color: "#f59e0b", border: "#f59e0b", label: "Medium" },
  low: { color: "#22c55e", border: "#22c55e", label: "Low" },
}
