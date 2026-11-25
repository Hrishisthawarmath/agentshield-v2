// Mirrors backend/app/agent/runner.py — naive planner + guard layer
import { analyze } from './detector'
import { evaluateCall } from './monitor'

const TXNS = {
  'TXN-77821': { status: 'PAID', amount: 48200, payee: 'Acme Office Supplies' },
  'TXN-55102': { status: 'FAILED_DEBITED', amount: 1250, payee: 'FreshMart' },
  'TXN-88410': { status: 'PENDING', amount: 112000, payee: 'Globex Logistics' },
  'TXN-66231': { status: 'DISPUTED', amount: 8999, payee: 'ShopFast Online' },
  'TXN-90017': { status: 'PENDING', amount: 35000, payee: 'Initech Services' },
}
const rid = () => Math.random().toString(16).slice(2, 10)

function execTool(tool, args, task) {
  if (tool === 'read_document') return args.path === task.source ? { content: task.content.slice(0, 120) + '…' } : { content: '<mock file contents>' }
  if (tool === 'payment_lookup') return args.txn_id ? { record: TXNS[args.txn_id] || { status: 'NOT_FOUND' } } : { record: { account: args.account, holder: 'Dummy Customer', balance: 'XXXX' } }
  if (tool === 'draft_email') return { draft_id: `DRAFT-${rid().slice(0, 4)}`, sent: false }
  if (tool === 'initiate_payment') return { staged_id: `PAY-${rid().slice(0, 4)}`, executed: false, note: 'SANDBOX: mock only' }
  return { error: 'unknown tool' }
}

export function planSteps(task) {
  return [
    { tool: 'read_document', args: { path: task.source }, tainted: false },
    ...(task.legit_calls || []).map((c) => ({ ...c, tainted: false })),
    ...(task.injected_calls || []).map((c) => ({ ...c, tainted: true })),
  ]
}

export function runTask(task, guard = true) {
  const runId = rid()
  const now = () => new Date().toISOString()
  const scan = analyze(task.content, task.trust)
  const quarantined = guard && scan.verdict === 'BLOCK'
  const events = [{ id: rid(), run_id: runId, task_id: task.id, task_title: task.title, channel: task.channel, type: 'content_scan', ts: now(), decision: scan.verdict, risk: scan.score, reasons: scan.reasons, target: task.source }]
  const trace = []
  const history = []
  for (const step of planSteps(task)) {
    const call = { tool: step.tool, args: step.args }
    let mon
    if (step.tool === 'read_document' && step.args.path === task.source) mon = { decision: 'ALLOW', risk: 0, reasons: ["Reading the task's own source document"] }
    else {
      mon = evaluateCall(call, task, history, step.tainted)
      if (quarantined && step.tainted) mon = { decision: 'BLOCK', risk: Math.max(mon.risk, scan.score), reasons: ['Source content quarantined by injection detector', ...mon.reasons] }
    }
    const executed = !guard || mon.decision !== 'BLOCK'
    history.push(call)
    trace.push({ ...call, tainted: step.tainted, monitor: mon, executed, result: executed ? execTool(call.tool, call.args, task) : null })
    if (mon.decision !== 'ALLOW') events.push({ id: rid(), run_id: runId, task_id: task.id, task_title: task.title, channel: task.channel, type: 'tool_call', ts: now(), decision: guard ? mon.decision : 'EXECUTED', risk: mon.risk, reasons: mon.reasons, target: call.tool, args: call.args })
  }
  const compromised = trace.some((t) => t.tainted && t.executed)
  const outcome = compromised ? 'COMPROMISED' : quarantined || trace.some((t) => !t.executed) ? 'BLOCKED' : 'SAFE'
  return { runId, task, guard, scan, trace, events, compromised, outcome }
}
