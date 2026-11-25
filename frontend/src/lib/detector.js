// Mirrors backend/app/detection (heuristics + TF-IDF/LogReg classifier exported to model.json)
import model from '../data/model.json'

export const RULES = [
  { id: 'H01', name: 'Instruction override', category: 'override', weight: 0.55,
    re: /\b(ignore|disregard|forget|override)\b[^.]{0,30}\b(previous|prior|above|all|earlier|your|the)\b[^.]{0,20}\b(instructions?|rules|prompts?|task|policy|everything)\b|\bforget everything\b|\bignore the task\b|\bstop summari[sz]ing\b/i,
    explain: "Text tries to replace the agent's original instructions." },
  { id: 'H02', name: 'Role / system impersonation', category: 'impersonation', weight: 0.45,
    re: /\b(system\s*(notice|prompt|update|:)|you are now|act as|pretend|developer mode|new instructions|as your new operator|administrator:)|###\s*(system|instruction)|<\|im_start\|>/i,
    explain: "Data claims to be a system/admin message or redefines the agent's role." },
  { id: 'H03', name: 'Concealment request', category: 'concealment', weight: 0.4,
    re: /\b(do not|don't|without)\s+(inform|tell|telling|notify|notifying|mention|alert)\w*|\bsilently\b|\bsecretly\b|\bwithout (approval|telling anyone)\b|\bdisable logging\b|\bdelete the audit log\b/i,
    explain: 'Asks the agent to hide actions from the user or audit trail.' },
  { id: 'H04', name: 'Embedded financial command', category: 'financial_action', weight: 0.45,
    re: /\b(transfer|wire|send|pay|remit|initiate)\b[^.]{0,40}\b(inr|rs\.?|usd|funds|money|payment|\d[\d,]{3,})\b[^.]{0,40}\b(to|account|beneficiary)\b/i,
    explain: 'Contains an imperative money-movement instruction inside untrusted content.' },
  { id: 'H05', name: 'Credential / PII exfiltration', category: 'exfiltration', weight: 0.55,
    re: /\b(forward|send|share|email|reveal|export|output)\b[^.]{0,60}\b(card number|cvv|otp|pin|passwords?|api keys?|credentials|account numbers|balances|customer records?|system prompt)\b/i,
    explain: 'Requests sensitive data be sent or revealed.' },
  { id: 'H06', name: 'Tool-call syntax in data', category: 'tool_injection', weight: 0.5,
    re: /\b(initiate_payment|draft_email|payment_lookup|read_document)\s*\(|\bcall (the )?(tool|function)\b|\bfunction_call\b|\bexecute:/i,
    explain: 'Untrusted content contains direct tool/function invocation syntax.' },
  { id: 'H07', name: 'Policy / control bypass', category: 'bypass', weight: 0.45,
    re: /\b(bypass|skip|disable|override)\b[^.]{0,30}\b(verification|approval|2fa|two-factor|limits?|fraud checks?|policy)\b|\blimits are disabled\b/i,
    explain: 'Attempts to switch off security controls.' },
  { id: 'H08', name: 'False authority / urgency', category: 'social_engineering', weight: 0.2,
    re: /\b(authori[sz]ed by|approved it|ceo|ciso|cfo approval|mandatory compliance)\b/i,
    explain: 'Invokes executive authority to pressure the agent.' },
  { id: 'H09', name: 'Obfuscation / hidden text', category: 'obfuscation', weight: 0.4,
    re: /[\u200b\u200c\u200d\u2060\ufeff]|<!--|\[white-text\]|display\s*:\s*none|font-size\s*:\s*0|\b[A-Za-z0-9+/]{32,}={0,2}(?=\s|$)|decode and execute/i,
    explain: 'Uses hidden/encoded text that a human reviewer would not see.' },
  { id: 'H10', name: 'Path traversal / secrets access', category: 'file_access', weight: 0.5,
    re: /\.\.\/|\/etc\/passwd|secrets?\.env|\.ssh\/|id_rsa/i,
    explain: 'References files outside the sandbox or secret stores.' },
]
const NEGATION = /\b(never|not|no|don't|must not)\b[^.]{0,20}$/i
const NEGATABLE = new Set(['H04', 'H05'])

export function heuristicScan(text) {
  const hits = []
  for (const r of RULES) {
    let m = r.re.exec(text)
    if (m && NEGATABLE.has(r.id) && NEGATION.test(text.slice(Math.max(0, m.index - 30), m.index))) m = null
    if (m) hits.push({ id: r.id, name: r.name, category: r.category, weight: r.weight, match: m[0].slice(0, 80), index: m.index, length: m[0].length, explain: r.explain })
  }
  const score = 1 - hits.reduce((p, h) => p * (1 - h.weight), 1)
  return { score, hits }
}

export function classify(text) {
  const toks = text.toLowerCase().match(/\b\w\w+\b/gu) || []
  const grams = [...toks]
  for (let i = 0; i < toks.length - 1; i++) grams.push(`${toks[i]} ${toks[i + 1]}`)
  const tf = {}
  for (const g of grams) if (model.vocab[g]) tf[g] = (tf[g] || 0) + 1
  const w = Object.fromEntries(Object.entries(tf).map(([g, c]) => [g, c * model.vocab[g][0]]))
  const norm = Math.sqrt(Object.values(w).reduce((s, v) => s + v * v, 0)) || 1
  const contrib = Object.entries(w).map(([g, v]) => [g, (v / norm) * model.vocab[g][1]])
  const z = model.intercept + contrib.reduce((s, [, c]) => s + c, 0)
  const p = 1 / (1 + Math.exp(-z))
  const tokens = contrib.sort((a, b) => b[1] - a[1]).slice(0, 5).filter(([, c]) => c > 0).map(([token, c]) => ({ token, weight: +c.toFixed(3) }))
  return { p, tokens }
}

export const levelOf = (s) => (s >= 60 ? 'HIGH' : s >= 30 ? 'MEDIUM' : 'LOW')
export const verdictOf = (l) => ({ HIGH: 'BLOCK', MEDIUM: 'FLAG', LOW: 'ALLOW' })[l]

export function analyze(text, trust = 'external') {
  const h = heuristicScan(text)
  const c = classify(text)
  const bonus = trust === 'internal' ? -8 : 0
  const score = Math.max(0, Math.min(100, Math.round((0.55 * h.score + 0.45 * c.p) * 100 + bonus)))
  const level = levelOf(score)
  const reasons = h.hits.map((x) => `[${x.id}] ${x.name}: "${x.match}" — ${x.explain}`)
  reasons.push(`[ML] Classifier injection probability ${Math.round(c.p * 100)}%` + (c.tokens.length ? ` (top signals: ${c.tokens.slice(0, 3).map((t) => t.token).join(', ')})` : ''))
  return { score, level, verdict: verdictOf(level), heuristic_score: h.score, classifier_prob: c.p, rules: h.hits, tokens: c.tokens, reasons }
}

export const modelInfo = { type: model.type, samples: model.n_samples, cvF1: model.cv_f1, vocab: Object.keys(model.vocab).length }
