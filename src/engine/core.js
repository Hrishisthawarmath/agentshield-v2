// Detection engine: heuristic signals (data/rules.json) + TF-IDF/LogReg classifier (src/data/model.json).
// Mirrored 1:1 by backend/app/engine/scanner.py so the API and the in-browser fallback agree.
import rules from '../../data/rules.json'
import model from '../data/model.json'

const NEG = new RegExp(rules.negation, 'i')
const NEGATABLE = new Set(rules.negatable)
export const SIGNALS = rules.signals.map((s) => ({ ...s, re: new RegExp(s.pattern, 'gi') }))
export const LEVELS = rules.levels
const ZW = /[\u200b\u200c\u200d\u2060\ufeff]/g
const B64 = /[A-Za-z0-9+/]{20,}={0,2}/g

export const levelOf = (score) => [...LEVELS].reverse().find((l) => score >= l.min)

function decodeB64(s) {
  try {
    const out = atob(s)
    return /^[\x20-\x7e\n\r\t]+$/.test(out) && /[a-z]{3,}\s+[a-z]{3,}/i.test(out) ? out : null
  } catch { return null }
}

function tokens(text) {
  const toks = text.toLowerCase().match(/\b\w\w+\b/g) || []
  const grams = [...toks]
  for (let i = 0; i < toks.length - 1; i++) grams.push(`${toks[i]} ${toks[i + 1]}`)
  return grams
}

export function classify(text) {
  const tf = {}
  for (const g of tokens(text)) if (model.vocab[g]) tf[g] = (tf[g] || 0) + 1
  const w = Object.fromEntries(Object.entries(tf).map(([g, c]) => [g, c * model.vocab[g][0]]))
  const norm = Math.sqrt(Object.values(w).reduce((a, v) => a + v * v, 0)) || 1
  const contrib = Object.entries(w).map(([g, v]) => [g, (v / norm) * model.vocab[g][1]])
  const z = model.intercept + contrib.reduce((a, [, c]) => a + c, 0)
  const prob = 1 / (1 + Math.exp(-z))
  const top = contrib.filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([token, c]) => ({ token, weight: Math.round(c * 1000) / 1000 }))
  const points = prob >= 0.5 ? Math.min(15, Math.floor((prob - 0.5) * 30 + 0.5)) : 0
  return { prob: Math.round(prob * 1000) / 1000, points, tokens: top }
}

function attackTypeOf(ids, source, obfuscatedHit) {
  const has = (k) => ids.has(k)
  if (!ids.size) return 'None (Benign)'
  if (obfuscatedHit) return 'Obfuscated Injection'
  if (source !== 'user' && (has('override') || has('goal'))) return 'Indirect Prompt Injection'
  if (has('goal')) return 'Goal Hijacking'
  if (has('exfil')) return 'Data Exfiltration'
  if (has('privesc')) return 'Privilege Escalation'
  if (has('tool') || has('financial')) return 'Tool Manipulation'
  if (has('override') || has('sysreveal')) return 'Direct Prompt Injection'
  return 'Suspicious Content'
}

const RECOMMEND = { SAFE: 'ALLOW', LOW: 'REVIEW — HUMAN APPROVAL', HIGH: 'BLOCK TOOL EXECUTION', CRITICAL: 'BLOCK TOOL EXECUTION' }

export function scan(text, source = 'user') {
  const zeroWidth = (text.match(ZW) || []).length
  const clean = text.replace(ZW, '')
  const decoded = (clean.match(B64) || []).map(decodeB64).filter(Boolean)
  const parts = [{ text: clean, hidden: false }, ...decoded.map((d) => ({ text: d, hidden: true }))]
  const found = new Map()
  const highlights = []
  let hiddenHit = false
  for (const s of SIGNALS) {
    for (const part of parts) {
      for (const m of part.text.matchAll(s.re)) {
        if (NEGATABLE.has(s.id) && NEG.test(part.text.slice(0, m.index))) continue
        if (!found.has(s.id)) found.set(s.id, { id: s.id, label: s.label, weight: s.weight, category: s.category, explain: s.explain, matches: [] })
        const f = found.get(s.id)
        if (f.matches.length < 3) f.matches.push(m[0].trim())
        if (part.hidden) { if (s.id !== 'obfusc') hiddenHit = true } else highlights.push([m.index, m.index + m[0].length])
      }
    }
  }
  if ((zeroWidth || decoded.length) && !found.has('obfusc')) {
    const s = SIGNALS.find((x) => x.id === 'obfusc')
    found.set('obfusc', { id: s.id, label: s.label, weight: s.weight, category: s.category, explain: s.explain, matches: [] })
  }
  if (found.has('obfusc')) {
    const f = found.get('obfusc')
    if (zeroWidth) f.matches.push(`${zeroWidth} zero-width chars`)
    decoded.forEach((d) => f.matches.push(`base64 → "${d}"`))
  }
  const signals = SIGNALS.filter((s) => found.has(s.id)).map((s) => found.get(s.id))
  const cls = classify(clean + (decoded.length ? '\n' + decoded.join('\n') : ''))
  const raw = signals.reduce((a, s) => a + s.weight, 0) + cls.points
  const score = Math.min(100, raw)
  const level = levelOf(score).name
  const ids = new Set(signals.map((s) => s.id).filter((i) => i !== 'obfusc' || signals.length === 1))
  return {
    source, text: clean, zeroWidth, decoded, score, rawScore: raw, level,
    attackType: attackTypeOf(ids, source, hiddenHit),
    signals, classifier: cls, recommended: RECOMMEND[level],
    highlights: highlights.sort((a, b) => a[0] - b[0]),
  }
}

export const modelInfo = { type: model.type, samples: model.n_samples, vocab: Object.keys(model.vocab).length, cvF1: model.cv_f1 }
