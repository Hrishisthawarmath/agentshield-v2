// Mirrors backend/app/monitor/policy.py
export const TRUSTED_DOMAINS = ['@securebank.example', '@customer.example']
const SENSITIVE = /\b(\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}|cvv|otp|password|api[_ ]?key|secret)\b/i
export const PAYMENT_LIMIT = 50000
export const MAX_LOOKUPS = 3

export const TOOL_SPECS = {
  read_document: { risk: 'low', desc: 'Read a file / email / web page from the sandbox' },
  payment_lookup: { risk: 'medium', desc: 'Look up a transaction or account (read-only)' },
  draft_email: { risk: 'medium', desc: 'Create an email DRAFT (never sent)' },
  initiate_payment: { risk: 'critical', desc: 'Stage a payment (mock, human approval required)' },
}

export const POLICIES = [
  { id: 'P01', name: 'Task tool scope', desc: 'Tool must be in the task allow-list', risk: 45 },
  { id: 'P02', name: 'Taint tracking', desc: 'Call derived from untrusted content', risk: 30 },
  { id: 'P03', name: 'Sandbox paths', desc: 'No ../, absolute paths or secret files', risk: 60 },
  { id: 'P04', name: 'Lookup volume baseline', desc: `> ${MAX_LOOKUPS} lookups per task is out-of-pattern`, risk: 40 },
  { id: 'P05', name: 'Sensitive fields', desc: 'Card / CVV / OTP fields requested', risk: 50 },
  { id: 'P06', name: 'Recipient allow-list', desc: `Email only to ${TRUSTED_DOMAINS.join(', ')}`, risk: 35 },
  { id: 'P07', name: 'Outbound DLP', desc: 'Card numbers, OTPs, credentials in email body', risk: 50 },
  { id: 'P08', name: 'Money movement', desc: 'initiate_payment always needs human approval', risk: 40 },
  { id: 'P09', name: 'Agent payment limit', desc: `Amount above ₹${PAYMENT_LIMIT.toLocaleString('en-IN')}`, risk: 25 },
]

export function evaluateCall(call, task, history, tainted) {
  const { tool, args = {} } = call
  const reasons = []
  let risk = 0
  const add = (r, msg) => { risk += r; reasons.push(msg) }
  if (!task.allowed_tools.includes(tool)) add(45, `Tool '${tool}' is outside the task's allowed scope [${task.allowed_tools.join(', ')}]`)
  if (tainted) add(30, 'Call originated from instructions found in untrusted content (taint tracking)')
  if (tool === 'read_document') {
    const p = String(args.path || '')
    if (p.includes('..') || /secret/i.test(p) || p.startsWith('/')) add(60, `Path '${p}' escapes the sandbox or targets secrets`)
  } else if (tool === 'payment_lookup') {
    const n = history.filter((h) => h.tool === 'payment_lookup').length + 1
    if (n > MAX_LOOKUPS) add(40, `Out-of-pattern volume: ${n} lookups in one task (baseline ≤ ${MAX_LOOKUPS})`)
    if (args.fields && SENSITIVE.test(String(args.fields))) add(50, 'Requests sensitive card/OTP fields')
    if (args.account && !args.txn_id) add(15, 'Account-level lookup when task references a transaction')
  } else if (tool === 'draft_email') {
    const to = String(args.to || '')
    if (!TRUSTED_DOMAINS.some((d) => to.endsWith(d))) add(35, `Recipient '${to}' is an untrusted external domain`)
    if (SENSITIVE.test(String(args.body || ''))) add(50, 'Email body contains card numbers / OTP / credentials (DLP)')
  } else if (tool === 'initiate_payment') {
    add(40, 'Critical tool: money movement always needs human approval')
    if (Number(args.amount || 0) > PAYMENT_LIMIT) add(25, `Amount ${args.amount} exceeds agent limit ${PAYMENT_LIMIT}`)
  }
  risk = Math.min(100, risk)
  if (!reasons.length) reasons.push('Within task scope and normal usage pattern')
  return { decision: risk >= 60 ? 'BLOCK' : risk >= 30 ? 'FLAG' : 'ALLOW', risk, reasons }
}
