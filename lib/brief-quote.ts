/**
 * Brief → Buoy quote: turn a task's tool needs into an immutable quoted plan.
 *
 * The quote IS the approval UX (ship-credits design §5): the user sees a
 * per-step cost breakdown once, approves once, and one job settles it.
 */
import { discoverServices, createQuote, type QuoteStep, type BriefQuote, type DiscoveredService } from "@/lib/buoy"

export interface TaskQuote {
  quote: BriefQuote
  /** Per-step enriched info for UI rendering. */
  detail: Array<QuoteStep & { serviceName?: string; outcome?: string; category?: string; rating?: number }>
}

/** Map a tool-need phrase to the top-ranked catalog candidate. */
async function pickService(need: string): Promise<DiscoveredService | null> {
  const candidates = await discoverServices(need, 3)
  if (candidates.length === 0) return null
  return candidates[0]
}

/**
 * Build a quote from natural-language tool needs (one per string).
 * Unresolvable needs are skipped; if nothing resolves, returns null.
 */
export async function quoteBriefTools(toolNeeds: string[]): Promise<TaskQuote | null> {
  const picks = await Promise.all(toolNeeds.map(pickService))
  const steps: QuoteStep[] = []
  const detail: TaskQuote["detail"] = []

  for (let i = 0; i < toolNeeds.length; i++) {
    const svc = picks[i]
    if (!svc) continue
    const step: QuoteStep = {
      name: svc.step.name,
      serviceId: svc.step.serviceId,
      amountUsd: svc.step.amountUsd,
    }
    steps.push(step)
    detail.push({
      ...step,
      serviceName: svc.name,
      outcome: svc.outcome,
      category: svc.category,
      rating: svc.rating,
    })
  }

  if (steps.length === 0) return null
  const quote = await createQuote(steps)
  if (!quote) return null
  return { quote, detail }
}
