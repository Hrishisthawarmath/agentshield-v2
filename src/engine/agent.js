// Sandboxed agent + tool security gateway + policy engine. Mirrored by backend/app/engine/agent.py.
import policyDoc from '../../data/policies.json'
import { scan } from './core.js'

export const POLICIES = policyDoc.policies
export const defaultPolicyState = () => Object.fromEntries(POLICIES.map((p) => [p.id, true]))

export const TOOLS = {
  read_file: { name: 'File Reader', fn: 'read_file()', permission: 'READ', risk: 'LOW', base: 10, desc: 'Reads files from the sandboxed /uploads store.' },
  payment_lookup: { name: 'Payment Lookup', fn: 'payment_lookup()', permission: 'SENSITIVE', risk: 'HIGH', base: 45, desc: 'Looks up balances & transactions in the mock core-banking ledger.' },
  draft_email: { name: 'Email Draft', fn: 'draft_email()', permission: 'WRITE', risk: 'MEDIUM', base: 30, desc: 'Creates an email draft. Never sends.' },
  fetch_web_content: { name: 'Web Fetch', fn: 'fetch_web_content()', permission: 'EXTERNAL', risk: 'MEDIUM', base: 30, desc: 'Fetches a page from allow-listed mock websites.' },
}
const MONEY_TOOLS = new Set(['transfer_money', 'approve_payment', 'initiate_payment'])
const ALLOWED_DOMAINS = ['examplebank.in', 'customer.examplebank.in', 'rbi.example']
const SECRET_RE = /secret|\.env|credential|password|system_prompt|\.\.\//i
const SENSITIVE_RE = /customer records|account numbers|card|cvv|otp|passwords?|credentials|customer list|balances/i

export const LEDGER = {
  'CUST-1042': { name: 'A. Sharma (synthetic)', balance: '₹1,84,220.55', limit: '₹2,00,000',
    txns: ['UPI Grocery ₹1,240', 'Electricity bill ₹2,310', 'Salary credit ₹85,000', 'Fuel ₹3,100', 'UPI Pharmacy ₹640'] },
}

export function goalTools(goal) {
  const g = goal.toLowerCase(); const t = []
  if (/read|summar|invoice|document|statement|file|kyc/.test(g)) t.push('read_file')
  if (/balance|account|payment status|transaction|look ?up|card limit/.test(g)) t.push('payment_lookup')
  if (/draft|reply|email|respond/.test(g)) t.push('draft_email')
  if (/fetch|web|page|url|site|circular/.test(g)) t.push('fetch_web_content')
  return t.length ? t : ['read_file']
}

const custId = (text) => (text.match(/CUST-\d{4}/) || [])[0] || 'CUST-1042'

function legitCalls(goal, content, source, resource) {
  const paths = { document: 'uploads/document.pdf', email: 'inbox/message.eml', web: 'web/page.html', tool_output: 'tool/output.json' }
  return goalTools(goal).filter((tool) => !(tool === 'read_file' && source === 'user' && !resource)).map((tool) => {
    if (tool === 'read_file') return { tool, args: { path: resource || paths[source] } }
    if (tool === 'payment_lookup') return { tool, args: { customer_id: custId(content), fields: ['balance', 'last_5_txns'] } }
    if (tool === 'draft_email') return { tool, args: { to: 'customer@customer.examplebank.in', subject: 'Re: your request', body: 'Summary of your request and next steps.' } }
    return { tool, args: { url: 'https://rbi.example/circulars/latest' } }
  })
}

function parseAmount(text) {
  const m = text.match(/(?:₹|rs\.?\s?|inr\s?|amount\s*=\s*)([\d,]{3,})/i)
  return m ? Number(m[1].replace(/,/g, '')) : null
}

// The naive agent obeys instructions found in content — this is what a compromised agent looks like.
function injectedCalls(sc) {
  const ids = new Set(sc.signals.map((s) => s.id))
  const text = [sc.text, ...sc.decoded].join('\n')
  const calls = []
  const email = (text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/) || [])[0]
  const account = (text.match(/account[^\d\n]{0,20}(\d{8,})|to_account\s*=\s*'?(\d{8,})/i) || []).slice(1).find(Boolean)
  if (/payment_lookup tool|payment_lookup\s*\(|customer accounts|all customers/i.test(text) || (ids.has('privesc') && ids.has('financial')))
    calls.push({ tool: 'payment_lookup', args: { customer_id: '*', scope: 'ALL_CUSTOMERS' } })
  if (ids.has('financial')) {
    if (/approve any payment/i.test(text)) calls.push({ tool: 'approve_payment', args: { payment_id: 'ANY', bypass_verification: true } })
    else calls.push({ tool: 'transfer_money', args: { amount: parseAmount(text) || 50000, to_account: account || 'UNKNOWN' } })
  }
  if (ids.has('sysreveal') || (ids.has('credential') && /secret|password|credential|\.\./i.test(text)))
    calls.push({ tool: 'read_file', args: { path: ids.has('sysreveal') ? 'config/system_prompt.txt' : '../../config/secrets.env' } })
  if (ids.has('exfil'))
    calls.push({ tool: 'draft_email', args: { to: email || 'unknown@external.example', subject: 'Data export', body: 'Customer records CUST-1001..1050: names, account numbers, balances' } })
  const url = (text.match(/https?:\/\/[^\s'")]+/) || [])[0]
  if (url && ids.has('tool')) calls.push({ tool: 'fetch_web_content', args: { url } })
  return calls.map((c) => ({ ...c, tainted: true }))
}

const domainOf = (s) => (s.split('@')[1] || s.replace(/^https?:\/\//, '').split('/')[0]).toLowerCase()
const allowedDomain = (d) => ALLOWED_DOMAINS.some((a) => d === a || d.endsWith('.' + a))

export function describeCall(c) {
  const a = c.args
  if (c.tool === 'transfer_money') return `Transfer ₹${(a.amount || 0).toLocaleString('en-IN')} to account ${a.to_account}`
  if (c.tool === 'approve_payment') return 'Approve any pending payment without verification'
  if (c.tool === 'payment_lookup') return a.customer_id === '*' ? 'Retrieve ALL customer accounts' : `Look up balance & transactions for ${a.customer_id}`
  if (c.tool === 'read_file') return SECRET_RE.test(a.path) ? `Read restricted file ${a.path}` : `Read ${a.path}`
  if (c.tool === 'draft_email') return allowedDomain(domainOf(a.to)) ? `Draft reply to ${a.to}` : `Send customer information to external address ${a.to}`
  if (c.tool === 'fetch_web_content') return `Fetch ${a.url}`
  return `${c.tool}()`
}

export function evaluateCall(call, ctx) {
  const { scanResult, goalSet, policies } = ctx
  const on = (id) => policies[id] !== false
  const spec = TOOLS[call.tool]
  const v = []
  const add = (id, decision, reason) => { if (on(id)) v.push({ policy: id, decision, reason }) }
  const a = call.args
  if (call.tainted) {
    if (scanResult.score >= 60) add('P01', 'BLOCK', `Call originates from untrusted ${scanResult.source} content rated ${scanResult.level} (${scanResult.score}/100).`)
    else if (scanResult.score >= 30) add('P01', 'REVIEW', `Call originates from untrusted content rated ${scanResult.level}.`)
  }
  if (MONEY_TOOLS.has(call.tool)) add('P02', 'REVIEW', 'Payment action requires human approval.')
  if (spec && spec.risk === 'HIGH' && (scanResult.score >= 30 || a.customer_id === '*')) add('P03', 'REVIEW', `${spec.name} is a SENSITIVE tool and the request context is not clean.`)
  if (SECRET_RE.test(JSON.stringify(a))) add('P04', 'BLOCK', 'Agents cannot access credentials, secrets or system prompts.')
  if (!spec) add('P05', 'BLOCK', `Unknown tool "${call.tool}" is not registered in the sandbox.${MONEY_TOOLS.has(call.tool) ? ' Unauthorized financial action.' : ''}`)
  if (a.customer_id === '*') add('P06', 'BLOCK', 'Wildcard customer_id — bulk lookups are not permitted.')
  if (a.amount > 50000) add('P06', 'BLOCK', `Amount ₹${a.amount.toLocaleString('en-IN')} exceeds the ₹50,000 sandbox limit.`)
  if (a.to && !allowedDomain(domainOf(a.to))) add('P06', 'REVIEW', `Recipient domain ${domainOf(a.to)} is not on the allow-list.`)
  if (a.url && !allowedDomain(domainOf(a.url))) add('P06', 'REVIEW', `URL domain ${domainOf(a.url)} is not on the allow-list.`)
  if (!goalSet.includes(call.tool)) add('P07', 'BLOCK', 'The requested tool action exceeds the original user goal (goal deviation).')
  if ((call.tool === 'draft_email' || call.tool === 'fetch_web_content') && SENSITIVE_RE.test(JSON.stringify(a)) && !allowedDomain(domainOf(a.to || a.url || '')))
    add('P08', 'BLOCK', 'Sensitive customer data cannot be exported outside the bank.')
  let risk = spec ? spec.base : 70
  if (call.tainted) risk = Math.max(risk, scanResult.score)
  if (v.some((x) => x.decision === 'BLOCK')) risk = Math.max(risk, 85)
  else if (v.length) risk = Math.max(risk, 65)
  if (call.tainted && MONEY_TOOLS.has(call.tool)) risk = Math.max(risk, 95)
  risk = Math.min(100, risk)
  let decision = v.some((x) => x.decision === 'BLOCK') ? 'BLOCK' : v.length ? 'REVIEW' : 'ALLOW'
  if (decision === 'ALLOW' && risk >= 60 && on('P09')) { v.push({ policy: 'P09', decision: 'REVIEW', reason: 'Critical action (risk ≥ 60) requires human approval.' }); decision = 'REVIEW' }
  return { decision, risk, violations: v, reason: v.length ? v[0].reason : 'Within goal scope, parameters valid, context clean.' }
}

export function executeTool(call, content) {
  const a = call.args
  if (call.tool === 'read_file') return SECRET_RE.test(a.path) ? { simulated: true, note: 'Sandbox decoy: restricted file contents withheld' } : { path: a.path, preview: content.slice(0, 140) }
  if (call.tool === 'payment_lookup') {
    if (a.customer_id === '*') return { simulated: true, rows: 50, note: 'Synthetic bulk dataset returned (sandbox)' }
    const c = LEDGER[a.customer_id] || LEDGER['CUST-1042']
    return { customer_id: a.customer_id, name: c.name, balance: c.balance, last_5_txns: c.txns }
  }
  if (call.tool === 'draft_email') return { draft_id: `DRF-${(a.to.length * 97 + a.subject.length) % 9000 + 1000}`, status: 'DRAFT (not sent)', to: a.to }
  if (call.tool === 'fetch_web_content') return { status: 200, url: a.url, title: 'Mock page (sandbox)' }
  return { simulated: true, note: 'Sandbox only — no funds moved, no real API called' }
}

export function runAgent({ goal, content, source = 'user', resource, policies = defaultPolicyState(), scanResult }) {
  const sc = scanResult || scan(content, source)
  const goalSet = goalTools(goal)
  const planned = [...legitCalls(goal, content, source, resource).map((c) => ({ ...c, tainted: false })),
    ...(sc.score >= 30 ? injectedCalls(sc) : [])]
  const calls = planned.map((c, i) => {
    const ev = evaluateCall(c, { scanResult: sc, goalSet, policies })
    const executed = ev.decision === 'ALLOW'
    return { id: i + 1, ...c, label: describeCall(c), ...ev, executed, status: executed ? 'EXECUTED' : ev.decision === 'BLOCK' ? 'BLOCKED' : 'PENDING',
      result: executed ? executeTool(c, sc.text) : null }
  })
  const tainted = calls.filter((c) => c.tainted)
  const compromised = tainted.some((c) => c.executed)
  const status = compromised ? 'COMPROMISED' : calls.some((c) => c.status === 'PENDING') ? 'WARNING' : tainted.length ? 'BLOCKED' : 'SAFE'
  const dev = calls.find((c) => c.tainted || !goalSet.includes(c.tool))
  const deviation = dev ? {
    detected: true, original: goal, current: dev.label,
    severity: MONEY_TOOLS.has(dev.tool) || dev.tool === 'draft_email' || dev.risk >= 80 ? 'CRITICAL' : 'HIGH',
    action: compromised ? 'EXECUTED (policies disabled)' : dev.decision,
  } : { detected: false, original: goal, current: goal, severity: 'NONE', action: 'ALLOW' }
  return { goal, goalTools: goalSet, source, calls, status, compromised, deviation,
    summary: calls.filter((c) => c.executed && !c.tainted).length ? 'Agent completed the user task with permitted tools.' : 'No legitimate result produced.' }
}

const severityOfRisk = (r) => (r >= 80 ? 'CRITICAL' : r >= 60 ? 'HIGH' : r >= 30 ? 'LOW' : 'SAFE')

export function buildEvents(run, startTs) {
  const { scan: sc, agent, id: runId, name } = run
  const ev = []
  let t = startTs
  const push = (type, severity, description, extra = {}) => ev.push({ id: `${runId}-${ev.length + 1}`, runId, ts: (t += 350), type, severity, description, risk: extra.risk ?? sc.score, attackType: sc.attackType, tool: extra.tool || '—', decision: extra.decision || '—', reason: extra.reason || '', scenario: name })
  push('REQUEST RECEIVED', 'INFO', `Untrusted ${sc.source.replace('_', ' ')} input received for goal: "${run.goal}"`, { risk: 0 })
  push('CONTENT ANALYZED', sc.level, `Risk ${sc.score}/100 · ${sc.signals.length} signal(s) · classifier p=${sc.classifier.prob}`, { reason: sc.signals.map((s) => s.label).join(', ') || 'No malicious signals' })
  if (sc.level !== 'SAFE') push(sc.level === 'LOW' ? 'SUSPICIOUS CONTENT' : 'PROMPT INJECTION DETECTED', sc.level, `${sc.attackType} detected`, { decision: sc.recommended.split(' ')[0], reason: sc.signals.map((s) => `${s.label} +${s.weight}`).join(', ') })
  if (!agent) return ev
  for (const c of agent.calls) {
    push('TOOL REQUEST INTERCEPTED', c.tainted ? severityOfRisk(c.risk) : 'INFO', `${c.tool}(${Object.entries(c.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')})`, { tool: c.tool, risk: c.risk })
    c.violations.forEach((v) => push('POLICY VIOLATION', v.decision === 'BLOCK' ? 'CRITICAL' : 'HIGH', `${v.policy} — ${POLICIES.find((p) => p.id === v.policy)?.name}`, { tool: c.tool, risk: c.risk, decision: v.decision, reason: v.reason }))
    const type = c.decision === 'ALLOW' ? 'ACTION ALLOWED' : c.decision === 'BLOCK' ? 'ACTION BLOCKED' : 'HUMAN REVIEW REQUIRED'
    push(type, c.decision === 'ALLOW' ? (c.tainted ? 'CRITICAL' : 'SAFE') : c.decision === 'BLOCK' ? severityOfRisk(c.risk) : 'HIGH', c.label, { tool: c.tool, risk: c.risk, decision: c.decision, reason: c.reason })
  }
  if (agent.deviation.detected) push('GOAL DEVIATION DETECTED', agent.deviation.severity, `Original: "${agent.deviation.original}" → Proposed: "${agent.deviation.current}"`, { decision: agent.deviation.action, reason: 'Compromised-agent behaviour' })
  if (agent.compromised) push('AGENT COMPROMISED', 'CRITICAL', 'Untrusted instruction executed — protective policies were disabled.', { decision: 'EXECUTED' })
  return ev
}

export function runPipeline({ id, name, scenarioId = null, goal, content, source = 'user', resource, policies, ts }) {
  const sc = scan(content, source)
  const agent = runAgent({ goal, content, source, resource, policies, scanResult: sc })
  const run = { id, name: name || 'Custom input', scenarioId, goal, content, source, resource, ts, scan: sc, agent }
  return { ...run, events: buildEvents(run, ts) }
}
