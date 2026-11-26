// Pure request logic for AgentShield — User & Admin.
// No React here, so the flows can be exercised headlessly.
// Reuses the copied detection engine (src/engine/agent.js + core.js).
// The demo data in scenarios.json contains prompt-injection attack
// examples — that is the project's subject. This module only feeds that
// data to the detection engine; it never follows it.
import scenarios from '../../data/scenarios.json'
import { runPipeline, defaultPolicyState, executeTool, POLICIES, TOOLS } from '../engine/agent.js'
import { modelInfo } from '../engine/core.js'

export { POLICIES, TOOLS, modelInfo }

export const STORE_KEY = 'agentshield.user.store.v1'
export const SESSION_KEY = 'agentshield.user.session.v1'

export const ACCOUNTS = {
  user: { email: 'demo.user@gmail.com', name: 'Demo User', role: 'user' },
  admin: { email: 'demo.admin@gmail.com', name: 'Admin', role: 'admin' },
}
export const accountByEmail = (email) =>
  Object.values(ACCOUNTS).find((a) => a.email === email) || null

// A second demo user exists only in the seeded data, so the admin view
// is genuinely multi-user. They have no sign-in card.
const SECOND_USER = { email: 'meera.demo@gmail.com', name: 'Meera Nair' }

const pad = (n) => String(n).padStart(4, '0')

// --- Plain-language wording -----------------------------------------------

export const VERDICT = {
  SAFE: {
    label: 'Safe',
    headline: 'Safe — nothing risky found',
    tone: 'safe',
    blurb: 'We checked every word. Nothing here tries to steer the assistant, and the actions it planned are ordinary for your request.',
  },
  LOW: {
    label: 'Needs review',
    headline: 'Needs a human check',
    tone: 'review',
    blurb: 'Something in this request looks off, but it is not clearly an attack. An admin will look at it before anything risky runs.',
  },
  HIGH: {
    label: 'Blocked',
    headline: 'Blocked — risky actions stopped',
    tone: 'blocked',
    blurb: 'This request tried to push the assistant into actions you did not ask for. Those actions were stopped before they ran.',
  },
  CRITICAL: {
    label: 'Blocked',
    headline: 'Blocked — a serious attack was stopped',
    tone: 'blocked',
    blurb: 'This is a clear attack: hidden instructions tried to take over the assistant. Every risky action was stopped before it ran.',
  },
}
export const verdictOf = (scan) => VERDICT[scan.level] || VERDICT.SAFE

export const ATTACK_PLAIN = {
  'None (Benign)': 'No attack pattern found.',
  'Indirect Prompt Injection': 'A hidden instruction inside a document, email or web page tried to steer the assistant.',
  'Direct Prompt Injection': 'The message itself tried to override the assistant and change what it does.',
  'Goal Hijacking': 'The content tried to swap your goal for a different one.',
  'Data Exfiltration': 'The content tried to get customer data sent outside.',
  'Privilege Escalation': 'The content claimed higher authority than it has.',
  'Tool Manipulation': 'The content told the assistant which tool to call.',
  'Obfuscated Injection': 'Hidden or encoded text a person would not notice tried to steer the assistant.',
  'Suspicious Content': 'Something in the content looks suspicious, but it does not match a known attack pattern.',
}
export const attackTypePlain = (t) => ATTACK_PLAIN[t] || t

export const STATUS_TEXT = {
  allowed: {
    label: 'Allowed',
    detail: 'The assistant ran the safe actions for your request.',
  },
  awaiting: {
    label: 'Waiting for admin decision',
    detail: 'An admin will review this. Nothing risky has run.',
  },
  approved: {
    label: 'Approved — action ran',
    detail: 'An admin approved it. The safe actions ran; anything blocked stayed blocked.',
  },
  denied: {
    label: 'Denied — action blocked',
    detail: 'An admin denied it. Nothing from this request ran.',
  },
}
export const statusText = (status) => STATUS_TEXT[status] || STATUS_TEXT.allowed

export const SOURCE_LABEL = {
  user: 'You typed it',
  email: 'Email',
  document: 'Document',
  web: 'Web page',
  tool_output: 'Tool output',
}
export const sourceLabel = (s) => SOURCE_LABEL[s] || s

export function callStatusText(call) {
  if (call.status === 'EXECUTED') return { label: 'Ran', tone: 'safe', detail: 'This ran in the sandbox.' }
  if (call.status === 'BLOCKED') return { label: 'Blocked', tone: 'blocked', detail: 'Stopped before it ran.' }
  return { label: 'Waiting for admin', tone: 'review', detail: 'Held for an admin decision.' }
}

export const RISK_BANDS = [
  { min: 0, max: 29, level: 'SAFE', action: 'ALLOW', plain: '0–29 · Safe · Allowed' },
  { min: 30, max: 59, level: 'LOW', action: 'REVIEW', plain: '30–59 · Low · Sent for review' },
  { min: 60, max: 79, level: 'HIGH', action: 'BLOCK', plain: '60–79 · High · Blocked' },
  { min: 80, max: 100, level: 'CRITICAL', action: 'BLOCK', plain: '80–100 · Critical · Blocked' },
]

// --- Store ---------------------------------------------------------------

function initialStatus(run) {
  const pending = run.agent.calls.some((c) => c.status === 'PENDING')
  return run.scan.score < 30 && !pending ? 'allowed' : 'awaiting'
}

function toRequest(run, user, status) {
  return {
    ...run,
    userEmail: user.email,
    userName: user.name,
    status: status || initialStatus(run),
    decisionBy: null,
    decisionTs: null,
    decisionNote: null,
  }
}

function seedState() {
  const policies = defaultPolicyState()
  const now = Date.now()
  const defs = [
    { scenarioId: 'safe', user: ACCOUNTS.user, ts: now - 3 * 3600 * 1000 },
    { scenarioId: 'indirect', user: ACCOUNTS.user, ts: now - 2 * 3600 * 1000 },
    { scenarioId: 'fintech', user: SECOND_USER, ts: now - 40 * 60 * 1000 },
  ]
  const requests = defs.map((d, i) => {
    const sc = scenarios.find((s) => s.id === d.scenarioId)
    const run = runPipeline({
      id: `REQ-${pad(i + 1)}`,
      name: sc.name,
      scenarioId: sc.id,
      goal: sc.goal,
      content: sc.content,
      source: sc.source,
      resource: sc.resource,
      policies,
      ts: d.ts,
    })
    return toRequest(run, d.user)
  })
  return { version: 1, seq: requests.length + 1, policies, requests }
}

const storage =
  typeof localStorage !== 'undefined' && localStorage ? localStorage : null

export function loadState() {
  if (!storage) return seedState()
  try {
    const raw = storage.getItem(STORE_KEY)
    if (!raw) {
      const s = seedState()
      storage.setItem(STORE_KEY, JSON.stringify(s))
      return s
    }
    const parsed = JSON.parse(raw)
    if (parsed && parsed.version === 1 && Array.isArray(parsed.requests)) return parsed
  } catch {
    // fall through to a fresh seed
  }
  const s = seedState()
  storage.setItem(STORE_KEY, JSON.stringify(s))
  return s
}

export function saveState(state) {
  if (storage) storage.setItem(STORE_KEY, JSON.stringify(state))
}

export function resetState() {
  const s = seedState()
  saveState(s)
  return s
}

export function submitRequest(state, { userEmail, userName, goal, content, source, resource }) {
  const id = `REQ-${pad(state.seq)}`
  const run = runPipeline({
    id,
    name: 'Your request',
    scenarioId: null,
    goal,
    content,
    source,
    resource,
    policies: state.policies,
    ts: Date.now(),
  })
  const req = toRequest(run, { email: userEmail, name: userName })
  return { ...state, seq: state.seq + 1, requests: [...state.requests, req], lastId: id }
}

export function decideRequest(state, requestId, decision, adminName) {
  // decision: 'approve' | 'deny'. Only PENDING (review) calls are decided.
  // Calls the policies already blocked stay blocked; approved calls run
  // in the sandbox via executeTool. Never executes a tainted blocked call.
  const found = state.requests.find((r) => r.id === requestId)
  if (!found || found.status !== 'awaiting') return state
  const now = Date.now()
  const calls = found.agent.calls.map((c) => {
    if (c.status !== 'PENDING') return c
    if (decision === 'approve') {
      return {
        ...c,
        executed: true,
        status: 'EXECUTED',
        resolution: 'APPROVED',
        result: executeTool(c, found.scan.text),
      }
    }
    return { ...c, executed: false, status: 'BLOCKED', resolution: 'REJECTED', result: null }
  })
  const tainted = calls.filter((c) => c.tainted)
  const compromised = tainted.some((c) => c.executed)
  const agentStatus = compromised
    ? 'COMPROMISED'
    : calls.some((c) => c.status === 'PENDING')
      ? 'WARNING'
      : tainted.length
        ? 'BLOCKED'
        : 'SAFE'
  const req = {
    ...found,
    agent: { ...found.agent, calls, compromised, status: agentStatus },
    status: decision === 'approve' ? 'approved' : 'denied',
    decisionBy: adminName,
    decisionTs: now,
    decisionNote:
      decision === 'approve'
        ? 'Admin approved the actions that needed review. Blocked actions stayed blocked.'
        : 'Admin denied the actions that needed review. Nothing from this request ran.',
    events: [
      ...found.events,
      {
        id: `${found.id}-D${found.events.length + 1}`,
        runId: found.id,
        ts: now,
        type: decision === 'approve' ? 'HUMAN APPROVED' : 'HUMAN REJECTED',
        severity: decision === 'approve' ? 'LOW' : 'SAFE',
        description:
          decision === 'approve'
            ? 'Admin approved — actions that needed review ran in the sandbox'
            : 'Admin denied — actions that needed review were blocked',
        risk: found.scan.score,
        attackType: found.scan.attackType,
        tool: '—',
        decision: decision === 'approve' ? 'APPROVED' : 'BLOCKED',
        reason: `Human decision by ${adminName}`,
        scenario: found.name,
      },
    ],
  }
  return { ...state, requests: state.requests.map((r) => (r.id === requestId ? req : r)) }
}

export function setPolicy(state, policyId, enabled) {
  return { ...state, policies: { ...state.policies, [policyId]: enabled } }
}

// --- Selectors ------------------------------------------------------------

export const requestsForUser = (state, email) =>
  state.requests.filter((r) => r.userEmail === email).sort((a, b) => b.ts - a.ts)

export const awaitingRequests = (state) =>
  state.requests.filter((r) => r.status === 'awaiting').sort((a, b) => a.ts - b.ts)

export const allRequests = (state) => [...state.requests].sort((a, b) => b.ts - a.ts)

export function usersWithRequests(state) {
  const map = new Map()
  for (const r of state.requests) {
    const cur = map.get(r.userEmail) || { email: r.userEmail, name: r.userName, count: 0 }
    cur.count += 1
    map.set(r.userEmail, cur)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export function metrics(state) {
  const calls = state.requests.flatMap((r) => r.agent.calls)
  return {
    total: state.requests.length,
    threats: state.requests.filter((r) => r.scan.level !== 'SAFE').length,
    blocked: calls.filter((c) => c.status === 'BLOCKED').length,
    executed: calls.filter((c) => c.status === 'EXECUTED').length,
    awaiting: state.requests.filter((r) => r.status === 'awaiting').length,
    safe: state.requests.filter((r) => r.scan.level === 'SAFE').length,
    approved: state.requests.filter((r) => r.status === 'approved').length,
    denied: state.requests.filter((r) => r.status === 'denied').length,
    avgScore: state.requests.length
      ? Math.round(state.requests.reduce((a, r) => a + r.scan.score, 0) / state.requests.length)
      : 0,
  }
}

export function allEvents(state) {
  return state.requests
    .flatMap((r) =>
      r.events.map((e) => ({ ...e, userEmail: r.userEmail, userName: r.userName })),
    )
    .sort((a, b) => b.ts - a.ts)
}

// --- Sample tasks for the user home page ----------------------------------

export const SAMPLE_PLAIN = {
  safe: 'A normal balance check. Should be allowed.',
  indirect: 'A supplier invoice hides a payment order. Watch it get stopped.',
  direct: 'A message that tries to override the assistant and reveal hidden instructions.',
  tool: 'An email tells the assistant to use a money tool it should not touch.',
  goal: 'A summary request quietly swapped for a data grab.',
  exfil: 'A request to send customer records outside the bank.',
  privesc: 'A message claiming admin powers it does not have.',
  obfusc: 'Hidden, encoded text a person would not notice.',
  fintech: 'A balance check hijacked into a large transfer.',
}
export const SAMPLE_TASKS = scenarios.map((s) => ({
  ...s,
  plain: SAMPLE_PLAIN[s.id] || s.name,
  expected: s.id === 'safe' ? 'Expected: allowed' : 'Expected: blocked or sent for review',
}))
