import { Layers, Server, Monitor, Database } from 'lucide-react'
import Pipeline from '../components/Pipeline.jsx'
import { Card, CardHeader, PageHeader } from '../components/ui.jsx'

const LAYERS = [
  ['Untrusted Input', 'Prompts, uploaded documents, emails, web pages, tool outputs. Zero-width chars stripped, base64 and HTML comments decoded.'],
  ['Prompt Injection Detector', 'Hybrid: TF-IDF + Logistic Regression classifier (scikit-learn) and 10 weighted heuristic signals with negation awareness.'],
  ['Risk Analysis Engine', 'Sums signal weights + classifier points into a 0–100 score, maps to SAFE / LOW / HIGH / CRITICAL with human-readable reasons.'],
  ['Policy Engine', '9 configurable runtime policies: untrusted content, payment approval, credentials, unknown tools, parameter validation, goal deviation, data export.'],
  ['Sandboxed AI Agent', 'Deliberately naive planner that follows instructions in its context — so the guardrails, not the model, provide safety.'],
  ['Tool Security Gateway', 'Intercepts every tool call: read_file, payment_lookup, draft_email, fetch_web_content. Unknown tools (transfer_money) always denied.'],
  ['Decision Layer', 'ALLOW → executes on mock tools. REVIEW → human approval queue. BLOCK → denied with reason.'],
  ['Audit Log & Dashboard', 'Every stage emits a structured event; metrics, charts and the event log update live.'],
]
const STACK = [
  [Monitor, 'Frontend', 'React 18 · Vite · Tailwind CSS 4 · Recharts · Framer Motion · Lucide · React Router'],
  [Server, 'Backend', 'Python · FastAPI · Pydantic · scikit-learn · NumPy · Uvicorn · pytest · Streamlit analyst view'],
  [Database, 'Data', 'Synthetic scenarios, mock ledger (CUST-1042…), JSON rule & policy catalogs shared by both engines'],
]

export default function Architecture() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Architecture" title="AgentShield Architecture" subtitle="A runtime security layer that sits between untrusted content, the AI agent and its tools." />
      <Card className="p-5"><Pipeline /></Card>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader icon={Layers} title="Layers" />
          <ol className="relative space-y-0 p-5">
            {LAYERS.map(([t, d], i) => (
              <li key={t} className="relative flex gap-4 pb-5 last:pb-0">
                {i < LAYERS.length - 1 && <span className="absolute left-[13px] top-7 h-full w-px bg-blue-500/20" />}
                <span className="z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600/20 font-mono text-xs font-bold text-blue-300 ring-1 ring-blue-500/40">{i + 1}</span>
                <div><div className="font-semibold text-slate-100">{t}</div><div className="text-sm text-slate-400">{d}</div></div>
              </li>))}
          </ol>
        </Card>
        <div className="space-y-5">
          {STACK.map(([Icon, t, d]) => <Card key={t} className="p-5"><div className="flex items-center gap-2 font-semibold text-white"><Icon size={16} className="text-blue-400" />{t}</div><p className="mt-2 text-sm text-slate-400">{d}</p></Card>)}
          <Card className="p-5 text-sm text-slate-400"><div className="font-semibold text-white">Deployment</div><p className="mt-2">Static frontend on Netlify runs the full engine in-browser (same rules & model weights). Set <code className="font-mono text-xs">VITE_API_URL</code> to route scans through FastAPI; if it is unreachable the UI shows “Security Engine Offline” and falls back locally.</p></Card>
        </div>
      </div>
    </div>
  )
}
