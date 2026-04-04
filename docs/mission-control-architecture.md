# Mission Control architecture

Shipyard Mission Control is moving toward a shared operator plane built on canonical records rather than page-specific data models. The goal is to let conversations, runs, activity, messages, and project views all point back to the same source objects so operators can answer what happened, why it happened, and what to do next.

## Canonical objects

### Conversations
Conversations are the top-level thread for operator and agent interaction. A conversation owns message history, linked runs, timestamps, agent identity, and optional task or project associations.

### Runs
Runs represent a specific execution attempt within a conversation. A run carries its own status, runtime label, timing, optional task linkage, and any terminal error information.

### Events
Events are the append-only timeline for state changes and notable actions. They connect conversations, runs, agents, tasks, and review activity into a common trace.

### Alerts
Alerts are operator-facing signals derived from canonical activity. They should point back to the underlying conversation, run, task, or project record instead of creating a separate source of truth.

### Tasks
Tasks remain the unit of planned work and delegation. Mission Control should reference task state from conversations and runs so execution context and planning context stay linked.

### Projects
Projects are the coordination surface above individual tasks and conversations. Project views should aggregate canonical conversation, run, task, and alert data into a shared war-room view.

## Derived views

Mission Control pages are intended to be projections over the canonical objects above.

- Activity: a cross-cutting stream derived mostly from events, with links back to runs, conversations, and tasks.
- Messages: a communication-focused lens over conversation messages and agent replies.
- Dashboard: a summary layer that rolls up canonical status, recent events, and blocking alerts.
- Search: an index over conversations, runs, events, messages, tasks, and projects that returns pointers to the source records.

## Navigation model

The current navigation direction is:

1. Start from an operator overview such as dashboard, activity, conversations, or projects.
2. Drill into a canonical object, usually a conversation or project.
3. Inspect related runs, events, task links, and alerts from that object detail view.
4. Jump to the execution surface that best matches the current question, while preserving links back to the same underlying records.

This keeps Shipyard's existing pages intact while making them feel like connected views of one system instead of separate tools.

## Current limitations

- Mission Control is still partial; not every page is backed by the same canonical model yet.
- Some surfaces still fetch and render data independently, which can lead to stale UI state during rapid navigation.
- Alerts and project war rooms are directional concepts today and are not yet fully standardized as first-class APIs.
- Search and dashboard aggregation are still evolving, so some navigation paths remain page-specific.
- The current implementation favors minimal incremental changes over a fully centralized client state model.
