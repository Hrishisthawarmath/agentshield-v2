import React from 'react'
import { Panel, SectionTitle, Tag } from '../components/ui'
import { RULES, modelInfo } from '../lib/detector'

export default function Policies() {
  return (
    <div className="space-y-6">
      <div>
        <div className="label text-cyan-400">07 · Detection Logic</div>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Rules & Model</h1>
        <p className="mt-1 text-slate-400">Transparent scoring: every point of risk traces back to a rule or a model feature.</p>
      </div>
      <Panel bracket className="p-5">
        <SectionTitle kicker="Risk formula" title="Explainable Score (0–100)" />
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 font-mono text-[13px] text-cyan-200">
          heuristic = 1 − Π(1 − w<sub>i</sub>) over matched rules<br />
          risk = round(100 × (0.55 × heuristic + 0.45 × P<sub>classifier</sub>)) − 8 if source is internal<br />
          <span className="text-slate-400">LOW &lt; 30 → ALLOW · MEDIUM 30–59 → FLAG · HIGH ≥ 60 → BLOCK / quarantine content</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4 font-mono text-[12px]">
          {[['Model', modelInfo.type], ['Training samples', modelInfo.samples], ['Vocabulary', modelInfo.vocab], ['5-fold CV F1', modelInfo.cvF1]].map(([k, v]) => (
            <div key={k} className="rounded border border-slate-800 p-3"><div className="text-slate-500">{k}</div><div className="mt-1 text-lg font-bold text-white">{v}</div></div>
          ))}
        </div>
      </Panel>
      <Panel className="p-5">
        <SectionTitle kicker="Heuristic engine" title={`${RULES.length} Injection Rules`} />
        <div className="grid gap-3 md:grid-cols-2">
          {RULES.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100"><Tag color="cyan">{r.id}</Tag>{r.name}<Tag color="slate" className="ml-auto">{r.category}</Tag><span className="font-mono text-[11px] text-rose-300">w {r.weight}</span></div>
              <div className="mt-1 text-[12px] text-slate-400">{r.explain}</div>
              <code className="mt-2 block truncate text-[10.5px] text-slate-500" title={r.re.source}>{r.re.source}</code>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
