import { runtime } from "@/lib/runtime"
import type { Task } from "@/lib/tasks"

export interface TaskEnrichment {
  enrichedTitle: string
  enrichedDescription: string
  acceptanceCriteria: string[]
  implementationPlan: string[]
  risks: string[]
  recommendedAssignee?: Task["assignee"]
}

function fallbackEnrichment(task: Pick<Task, "title" | "description" | "priority" | "assignee" | "tags">): TaskEnrichment {
  const title = task.title.trim()
  const summary = task.description?.trim() || title
  return {
    enrichedTitle: title,
    enrichedDescription: [
      `Objective: ${summary}`,
      `Priority: ${task.priority}`,
      `Current assignee: ${task.assignee}`,
    ].join("\n"),
    acceptanceCriteria: [
      "User can complete the flow without breaking existing sign-up behavior",
      "Implementation is covered by a test or manual verification path",
      "Task description reflects the final approach clearly enough for handoff",
    ],
    implementationPlan: [
      "Audit the current sign-up flow and identify insertion points",
      "Implement the smallest safe change behind existing task and approval flow",
      "Verify the behavior in the UI and update the task record with the final result",
    ],
    risks: ["Scope creep if the brief is left too open", "Authentication or onboarding regressions"],
    recommendedAssignee: task.assignee,
  }
}

export async function enrichTaskBrief(task: Pick<Task, "title" | "description" | "priority" | "assignee" | "tags">): Promise<TaskEnrichment> {
  const prompt = [
    "You are improving a product task brief before execution.",
    "Return strict JSON with keys: enrichedTitle, enrichedDescription, acceptanceCriteria, implementationPlan, risks, recommendedAssignee.",
    "Make it concise, specific, and execution-ready.",
    `Title: ${task.title}`,
    `Description: ${task.description ?? ""}`,
    `Priority: ${task.priority}`,
    `Assignee: ${task.assignee}`,
    `Tags: ${(task.tags ?? []).join(", ")}`,
  ].join("\n")

  try {
    const reply = await runtime.chat({ message: prompt })
    const parsed = JSON.parse(reply) as Partial<TaskEnrichment>
    if (parsed.enrichedTitle && parsed.enrichedDescription && Array.isArray(parsed.acceptanceCriteria) && Array.isArray(parsed.implementationPlan) && Array.isArray(parsed.risks)) {
      return {
        enrichedTitle: parsed.enrichedTitle,
        enrichedDescription: parsed.enrichedDescription,
        acceptanceCriteria: parsed.acceptanceCriteria.filter(Boolean).map(String),
        implementationPlan: parsed.implementationPlan.filter(Boolean).map(String),
        risks: parsed.risks.filter(Boolean).map(String),
        recommendedAssignee: parsed.recommendedAssignee ?? task.assignee,
      }
    }
  } catch {
    // fall through
  }

  return fallbackEnrichment(task)
}
