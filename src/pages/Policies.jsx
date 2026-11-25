import { ShieldCheck, Sigma, Brain } from 'lucide-react'
import { useStore, useMetrics } from '../store.jsx'
import { POLICIES } from '../engine/agent.js'
import { SIGNALS, LEVELS, modelInfo } from '../engine/core.js'
import { Badge, Card, CardHeader, PageHeader, cx } from '../components/ui.jsx'

export default function Policies() {
  const { state, togglePolicy } = useStore()
  const m = useMetrics()
  const hits = (id) => m.calls.reduce((a, c) => a + c.violations.filter((v) => v.policy === id).length, 0)
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Policy Engine" title="Security Policy Engine" subtitle="Policies are evaluated on every intercepted tool call. Toggle them to see how an unprotected agent gets compromised — new simulations use the current configuration." />
      <Card>
        <CardHeader icon={ShieldCheck} title="Runtime Policies" subtitle={`${Object.values(state.policies).filter(Boolean).length} of ${POLICIES.length} enabled`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="px-5 py-2.5">Policy</th><th className="px-3">Severity</th><th className="px-3">Action</th><th className="px-3">Triggered</th><th className="px-5 text-right">Status</th></tr></thead>
            <tbody>
              {POLICIES.map((p) => {
                const on = state.policies[p.id]
                return (
                  <tr key={p.id} className={cx('border-b border-white/[0.04]', !on && 'opacity-60')}>
                    <td className="px-5 py-3"><div className="font-medium text-slate-100"><span className="mr-2 font-mono text-xs text-slate-500">{p.id}</span>{p.name}</div><div className="text-xs text-slate-500">{p.description}</div></td>
                    <td className="px-3"><Badge value={p.severity}>{p.severity}</Badge></td>
                    <td className="px-3 font-mono text-xs text-slate-300">{p.action}</td>
                    <td className="px-3 font-mono text-slate-300">{hits(p.id)}</td>
                    <td className="px-5 text-right">
                      <button role="switch" aria-checked={on} aria-label={`${p.name} ${on ? 'enabled' : 'disabled'}`} onClick={() => togglePolicy(p.id)}
                        className={cx('relative inline-flex h-6 w-11 items-center rounded-full transition', on ? 'bg-blue-600' : 'bg-slate-700')}>
                        <span className={cx('inline-block h-4 w-4 rounded-full bg-white transition', on ? 'translate-x-6' : 'translate-x-1')} />
                      </button>
                    </td>
                  </tr>)
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Sigma} title="Risk Scoring Model" subtitle="score = min(100, Σ signal weights + classifier points)" />
          <ul className="divide-y divide-white/[0.04]">
            {SIGNALS.map((s) => <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-2 text-sm"><div className="min-w-0"><div className="text-slate-200">{s.label}</div><div className="truncate text-xs text-slate-500">{s.explain}</div></div><span className="font-mono font-semibold text-red-300">+{s.weight}</span></li>)}
            <li className="flex items-center justify-between px-5 py-2 text-sm"><div><div className="text-slate-200">ML classifier confidence</div><div className="text-xs text-slate-500">(p − 0.5) × 30 when p ≥ 0.5</div></div><span className="font-mono font-semibold text-blue-300">+0…15</span></li>
          </ul>
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-5 py-3">{LEVELS.map((l, i) => <Badge key={l.name} value={l.name}>{l.name} {l.min}–{LEVELS[i + 1] ? LEVELS[i + 1].min - 1 : 100} → {l.action}</Badge>)}</div>
        </Card>
        <Card>
          <CardHeader icon={Brain} title="Classification Layer" subtitle="Pluggable classifier abstraction" />
          <div className="space-y-3 p-5 text-sm text-slate-300">
            <p>Default: local deterministic <b>TF-IDF (1–2 grams) + Logistic Regression</b> trained with scikit-learn on {modelInfo.samples} synthetic samples ({modelInfo.vocab} features, 5-fold F1 {modelInfo.cvF1}). Weights are exported to JSON so the same model runs in FastAPI and in the browser.</p>
            <p className="text-slate-400">The <code className="font-mono text-xs">Classifier</code> interface in <code className="font-mono text-xs">backend/app/engine/classifier.py</code> can be swapped for a Hugging Face model or an LLM-API judge; API keys stay server-side only.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
