/**
 * MCP client for Shipyard marketplace.
 * Handles JSON-RPC initialize + tool call flow over Streamable HTTP.
 */

const BASE_URL = process.env.SHIPYARD_API_URL || "https://shipyard.so"
const MCP_ENDPOINT = `${BASE_URL}/api/mcp`

let _sessionId = null
let _initialized = false
let _requestId = 0

function nextId() {
  return ++_requestId
}

/**
 * Send a JSON-RPC request to the MCP endpoint.
 * Handles Streamable HTTP — reads the last complete JSON-RPC response from the stream.
 */
async function rpcCall(method, params = {}) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method,
    params,
    id: nextId(),
  })

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  }
  if (_sessionId) {
    headers["Mcp-Session-Id"] = _sessionId
  }

  const res = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers,
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MCP request failed (${res.status}): ${text}`)
  }

  // Capture session ID from response
  const sid = res.headers.get("mcp-session-id")
  if (sid) _sessionId = sid

  const contentType = res.headers.get("content-type") || ""

  if (contentType.includes("text/event-stream")) {
    // SSE stream — parse event data lines
    const text = await res.text()
    const lines = text.split("\n")
    let lastData = null
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        lastData = line.slice(6)
      }
    }
    if (!lastData) throw new Error("No data in SSE response")
    return JSON.parse(lastData)
  }

  return res.json()
}

/**
 * Initialize the MCP session. Must be called before tool calls.
 */
async function initialize() {
  if (_initialized) return

  const result = await rpcCall("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "shipyard-cli", version: "0.1.0" },
  })

  // Send initialized notification
  const notifyBody = JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  })

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  }
  if (_sessionId) {
    headers["Mcp-Session-Id"] = _sessionId
  }

  await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers,
    body: notifyBody,
  })

  _initialized = true
  return result
}

/**
 * Call an MCP tool by name with arguments.
 */
async function callTool(name, args = {}) {
  await initialize()

  const response = await rpcCall("tools/call", { name, arguments: args })

  if (response.error) {
    throw new Error(`MCP tool error: ${response.error.message || JSON.stringify(response.error)}`)
  }

  // Extract content from result
  const result = response.result
  if (!result) return null

  // MCP tool results come as content array
  if (result.content && Array.isArray(result.content)) {
    const textParts = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
    const joined = textParts.join("")
    try {
      return JSON.parse(joined)
    } catch {
      return joined
    }
  }

  return result
}

/**
 * Reset session state (for testing).
 */
function resetSession() {
  _sessionId = null
  _initialized = false
  _requestId = 0
}

export { callTool, initialize, resetSession, MCP_ENDPOINT, BASE_URL }
