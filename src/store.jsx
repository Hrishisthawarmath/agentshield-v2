import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import scenarios from '../data/scenarios.json'
import { runPipeline, defaultPolicyState, executeTool, runAgent, buildEvents } from './engine/agent.js'
import { scan } from './engine/core.js'
import { apiConfigured, call, fireAndForget, health } from './engine/api.js'

export const SCENARIOS = scenarios
export const scenarioById = (id) => scenarios.find((s) => s.id === id)
const SCAN_EVENTS = new Set(['REQUEST RECEIVED', 'CONTENT ANALYZED', 'PROMPT INJECTION DETECTED', 'SUSPICIOUS CONTENT'])
const SEED = ['safe', 'direct', 'safe', 'indirect', 'tool', 'safe', 'exfil', 'privesc']
export const DEMO_STEPS = [
  { id: 'safe', title: 'Safe request', note: 'Legitimate balance check — AgentShield must ALLOW it.' },
  { id: 'direct', title: 'Prompt injection', note: 'Direct override + system-prompt extraction attempt.' },
  { id: 'tool', title: 'Tool manipulation', note: 'Email tells the agent to call an unregistered transfer tool.' },
  { id: 'goal', title: 'Compromised agent', note: 'Goal deviation: summarise KYC → exfiltrate customer data.' },
  { id: 'fintech', title: 'Critical financial attack', note: 'Balance-check request hijacked into a ₹2,00,000 transfer.' },
  { id: 'indirect', title: 'Blocked action', note: 'Hidden invoice instruction → payment_lookup + transfer BLOCKED.' },
  { id: null, title: 'Dashboard updated', note: 'Counters, charts, live feed and audit log reflect every decision.' },
]

const pad = (n) => String(n).padStart(4, '0')

function seedState() {
  const base = new Date(); base.setHours(9, 0, 0, 0)
  const policies = defaultPolicyState()
  let runs = []; let events = []
  SEED.forEach((sid, i) => {
    const s = scenarioById(sid)
    const r = runPipeline({ ...s, id: `RUN-${pad(i + 1)}`, scenarioId: sid, policies, ts: base.getTime() + i * 9 * 60000 })
    runs.push(r); events = events.concat(r.events)
  })
  return { runs, events, policies, seq: SEED.length + 1, engine: apiConfigured ? 'checking' : 'local', demo: { running: false, paused: false, step: 0 }, lastSeen: events.length }
}

function recomputeStatus(agent) {
  const tainted = agent.calls.filter((c) => c.tainted)
  const compromised = tainted.some((c) => c.executed)
  const status = compromised ? 'COMPROMISED' : agent.calls.some((c) => c.status === 'PENDING') ? 'WARNING' : tainted.length ? 'BLOCKED' : 'SAFE'
  return { ...agent, compromised, status }
}

function reducer(state, a) {
  switch (a.type) {
    case 'ADD_RUN': return { ...state, runs: [...state.runs, a.run], events: [...state.events, ...a.run.events], seq: state.seq + 1 }
    case 'ATTACH_AGENT': return {
      ...state,
      runs: state.runs.map((r) => (r.id === a.runId ? { ...r, agent: a.agent } : r)),
      events: [...state.events, ...a.events],
    }
    case 'RESOLVE': {
      let newEvent
      const runs = state.runs.map((r) => {
        if (r.id !== a.runId) return r
        const calls = r.agent.calls.map((c) => {
          if (c.id !== a.callId) return c
          const ok = a.decision === 'APPROVE'
          newEvent = { id: `${r.id}-H${c.id}`, runId: r.id, ts: Date.now(), type: ok ? 'HUMAN APPROVED' : 'HUMAN REJECTED', severity: ok ? 'LOW' : 'SAFE',
            description: ok ? `✓ Human approval received — ${c.label} executed in sandbox` : `✓ Action blocked by analyst — ${c.label}`,
            risk: c.risk, attackType: r.scan.attackType, tool: c.tool, decision: ok ? 'APPROVED' : 'BLOCKED', reason: 'Human-in-the-loop decision', scenario: r.name }
          return { ...c, executed: ok, status: ok ? 'EXECUTED' : 'BLOCKED', resolution: ok ? 'APPROVED' : 'REJECTED', result: ok ? executeTool(c, r.scan.text) : null }
        })
        return { ...r, agent: recomputeStatus({ ...r.agent, calls }) }
      })
      return { ...state, runs, events: newEvent ? [...state.events, newEvent] : state.events }
    }
    case 'TOGGLE_POLICY': return { ...state, policies: { ...state.policies, [a.id]: !state.policies[a.id] } }
    case 'SET_POLICIES': return { ...state, policies: a.policies }
    case 'RESET': return { ...state, runs: [], events: [], seq: 1, demo: { running: false, paused: false, step: 0 }, lastSeen: 0 }
    case 'ENGINE': return { ...state, engine: a.engine }
    case 'DEMO': return { ...state, demo: { ...state.demo, ...a.demo } }
    case 'SEEN': return { ...state, lastSeen: state.events.length }
    default: return state
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, seedState)
  const ref = useRef(state); ref.current = state

  useEffect(() => { if (apiConfigured) health().then((engine) => dispatch({ type: 'ENGINE', engine })) }, [])

  const execute = useCallback(async (input, { withAgent = true } = {}) => {
    const st = ref.current
    const id = `RUN-${pad(st.seq)}`
    const payload = { ...input, id, policies: st.policies, ts: Date.now() }
    let run
    if (st.engine === 'online') {
      try { run = await call('/api/simulation/run', { ...payload, with_agent: withAgent }) } catch { dispatch({ type: 'ENGINE', engine: 'offline' }) }
    }
    if (!run) {
      run = runPipeline(payload)
      if (!withAgent) run = { ...run, agent: null, events: run.events.filter((e) => SCAN_EVENTS.has(e.type)) }
    }
    dispatch({ type: 'ADD_RUN', run })
    return run
  }, [])

  const simulateAgent = useCallback(async (runId) => {
    const st = ref.current
    const r = st.runs.find((x) => x.id === runId)
    if (!r || r.agent) return r
    let agent; let events
    if (st.engine === 'online') {
      try { ({ agent, events } = await call('/api/agent/run', { ...r, policies: st.policies, ts: Date.now() })) } catch { dispatch({ type: 'ENGINE', engine: 'offline' }) }
    }
    if (!agent) {
      agent = runAgent({ ...r, policies: st.policies, scanResult: r.scan })
      events = buildEvents({ ...r, agent }, Date.now()).filter((e) => !SCAN_EVENTS.has(e.type))
    }
    dispatch({ type: 'ATTACH_AGENT', runId, agent, events })
    return { ...r, agent }
  }, [])

  const resolve = useCallback((runId, callId, decision) => {
    dispatch({ type: 'RESOLVE', runId, callId, decision })
    fireAndForget('/api/tool/execute', { run_id: runId, call_id: callId, decision })
  }, [])
  const togglePolicy = useCallback((id) => {
    dispatch({ type: 'TOGGLE_POLICY', id })
    fireAndForget('/api/policies/update', { id, enabled: !ref.current.policies[id] })
  }, [])
  const reset = useCallback(() => { dispatch({ type: 'RESET' }); fireAndForget('/api/reset', {}) }, [])
  const demo = useCallback((d) => dispatch({ type: 'DEMO', demo: d }), [])
  const markSeen = useCallback(() => dispatch({ type: 'SEEN' }), [])

  // Demo Mode controller — lives in the provider so it keeps running across routes.
  useEffect(() => {
    const { running, paused, step } = state.demo
    if (!running || paused) return
    if (step >= DEMO_STEPS.length) { demo({ running: false }); return }
    const t = setTimeout(async () => {
      const s = DEMO_STEPS[step]
      if (s.id) { const sc = scenarioById(s.id); await execute({ ...sc, scenarioId: sc.id }) }
      demo({ step: step + 1 })
    }, step === 0 ? 600 : 6500)
    return () => clearTimeout(t)
  }, [state.demo, execute, demo])

  const value = useMemo(() => ({ state, execute, simulateAgent, resolve, togglePolicy, reset, demo, markSeen }), [state, execute, simulateAgent, resolve, togglePolicy, reset, demo, markSeen])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

export function useMetrics() {
  const { state } = useStore()
  return useMemo(() => {
    const runs = state.runs
    const calls = runs.flatMap((r) => (r.agent ? r.agent.calls.map((c) => ({ ...c, runId: r.id, ts: r.ts, attackType: r.scan.attackType })) : []))
    const recent = runs.slice(-5)
    const overall = recent.length ? Math.round(recent.reduce((a, r) => a + r.scan.score, 0) / recent.length) : 0
    const threatLevel = overall >= 80 ? 'CRITICAL' : overall >= 60 ? 'HIGH' : overall >= 30 ? 'ELEVATED' : 'LOW'
    const pending = runs.flatMap((r) => (r.agent ? r.agent.calls.filter((c) => c.status === 'PENDING').map((c) => ({ run: r, call: c })) : []))
    const compromised = runs.some((r) => r.agent?.compromised)
    return {
      calls, pending, overall, threatLevel, compromised,
      requests: runs.length,
      threats: runs.filter((r) => r.scan.level !== 'SAFE').length,
      blocked: calls.filter((c) => c.status === 'BLOCKED').length,
      reviewed: calls.filter((c) => c.decision === 'REVIEW').length,
      safe: runs.filter((r) => r.scan.level === 'SAFE').length,
      critical: runs.filter((r) => r.scan.level === 'CRITICAL').length,
      latest: runs[runs.length - 1],
    }
  }, [state.runs])
}

export { scan }
