/**
 * Agent Runtime Abstraction
 *
 * This file re-exports from the runtime registry.
 * To add a custom runtime, see lib/runtimes/index.ts
 */

export { runtime, registerRuntime, listRuntimes, listRuntimeNames } from "./runtimes"
export type { AgentRuntime, RuntimeSession, ActivateParams, ChatParams } from "./runtimes"
