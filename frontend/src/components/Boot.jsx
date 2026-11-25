import React, { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

const LINES = [
  ['AEGIS AGENT-GUARD RUNTIME v1.0.0 (Banking & Payments Sandbox)', null],
  ['Mounting sandboxed tool layer: read_document · payment_lookup · draft_email · initiate_payment', 'OK'],
  ['Loading 10 explainable injection heuristics (H01–H10)', 'OK'],
  ['Loading TF-IDF + Logistic Regression classifier (synthetic corpus)', 'OK'],
  ['Arming tool-call monitor: scope, taint, DLP, volume baselines', 'OK'],
  ['Verifying mock data only — no real payment rails connected', 'OK'],
  ['Compromised-agent defense modules armed & ready', 'OK'],
]

export default function Boot({ onDone }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= LINES.length) return
    const t = setTimeout(() => setN(n + 1), 280)
    return () => clearTimeout(t)
  }, [n])
  const done = n >= LINES.length
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
      <div className="relative h-32 w-32 rounded-full border border-cyan-500/30 bg-cyan-500/5 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full overflow-hidden"><div className="sweep h-full w-full" style={{ background: 'conic-gradient(from 0deg, rgba(34,211,238,.35), transparent 25%)' }} /></div>
        <div className="absolute inset-4 rounded-full border border-dashed border-cyan-400/40" />
        <img src="./shield.svg" alt="" className="relative h-16 w-16" />
      </div>
      <h1 className="mt-8 font-display text-5xl font-black tracking-[0.35em] text-white pl-[0.35em]">AEGIS</h1>
      <p className="mt-3 text-center font-mono text-[11px] tracking-[0.35em] text-cyan-400 uppercase max-w-xl">Agent Execution Guard & Injection Shield</p>
      <div className="panel bracket glow mt-10 w-full max-w-2xl p-5 font-mono text-[12.5px]">
        {LINES.slice(0, n).map(([l, ok], i) => (
          <div key={i} className="fadein flex gap-2 py-0.5">
            <span className="text-cyan-400">&gt;</span>
            <span className={i === 0 ? 'font-bold text-cyan-300' : 'text-slate-300'}>{l}{ok && <span className="text-slate-600"> ... </span>}</span>
            {ok && <span className="ml-auto font-bold text-emerald-400">{ok}</span>}
          </div>
        ))}
        {!done && <span className="caret text-cyan-400">▌</span>}
        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
          <span className={`flex items-center gap-2 tracking-widest text-[11px] ${done ? 'text-emerald-400' : 'text-slate-500'}`}><ShieldCheck size={16} /> {done ? 'GUARDRAILS ONLINE · SANDBOX LIVE' : 'INITIALISING...'}</span>
          <button disabled={!done} onClick={onDone} className="rounded-lg bg-cyan-400 px-4 py-2 font-sans text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-30">Enter Command Center →</button>
        </div>
      </div>
      <button onClick={onDone} className="mt-6 font-mono text-[10px] tracking-[0.25em] text-slate-500 hover:text-cyan-300 uppercase">Skip boot sequence</button>
    </div>
  )
}
