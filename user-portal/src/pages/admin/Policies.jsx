import { useStore } from '../../store.jsx'
import { POLICIES, TOOLS, RISK_BANDS, modelInfo } from '../../lib/requests.js'
import { Card, Badge } from '../../components/ui.jsx'

export default function Policies() {
  const { store, togglePolicy } = useStore()
  const policies = store.policies

  return (
    <div className="fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Policies</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          The nine rules checked before any tool runs. Turning one off affects future checks only —
          past decisions stay as they were. This is the operator view; users never see these controls.
        </p>
      </div>

      <div className="space-y-2">
        {POLICIES.map((p) => {
          const on = policies[p.id] !== false
          return (
            <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{p.id}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.name}</span>
                  <Badge tone={p.severity === 'CRITICAL' ? 'blocked' : p.severity === 'HIGH' ? 'review' : 'info'}>{p.severity}</Badge>
                  <Badge tone="neutral">{p.action}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Toggle policy ${p.id}`}
                onClick={() => togglePolicy(p.id, !on)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
              </button>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">How the score decides</h2>
          <div className="mt-3 space-y-2">
            {RISK_BANDS.map((b) => (
              <div key={b.level} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm">
                <span className="font-bold text-slate-800 dark:text-slate-200">{b.plain}</span>
                <span className="text-slate-600 dark:text-slate-400">{b.action}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Score = sum of the warning-signal points + classifier points, capped at 100.
            The classifier is TF-IDF / logistic regression, trained on {modelInfo.samples} samples
            (vocabulary {modelInfo.vocab.toLocaleString()}, CV F1 {modelInfo.cvF1}).
          </p>
        </Card>

        <Card>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Mock tools in the sandbox</h2>
          <ul className="mt-3 space-y-2">
            {Object.entries(TOOLS).map(([id, t]) => (
              <li key={id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.name} <span className="font-mono text-xs text-slate-500 dark:text-slate-400">({id})</span></span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">{t.desc}</span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Permission {t.permission} · Risk {t.risk}</span>
              </li>
            ))}
            <li className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-3 py-2">
              <span className="text-sm font-bold text-red-800 dark:text-red-300">transfer_money · approve_payment — not registered</span>
              <span className="block text-sm text-red-700 dark:text-red-400">Any attempt to call these is always refused, whatever the score says.</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
