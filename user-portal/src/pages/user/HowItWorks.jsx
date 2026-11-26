import { Search, ListChecks, ShieldCheck, Ban, XCircle } from 'lucide-react'
import { Card } from '../../components/ui.jsx'
import { RISK_BANDS } from '../../lib/requests.js'

const STEPS = [
  {
    icon: Search,
    title: '1 · You ask, we read',
    body: 'You type a request, or paste an email, document or web page for the assistant to read. We treat anything pasted in as untrusted — your own words are trusted, outside content is not.',
  },
  {
    icon: ListChecks,
    title: '2 · We check the words',
    body: 'Ten warning patterns are checked (hidden instructions, money orders, data grabs, secret requests, encoded text), plus a small trained classifier. Each hit adds points, and every point is shown to you.',
  },
  {
    icon: ShieldCheck,
    title: '3 · We score the risk',
    body: 'The points add up to a score from 0 to 100. Low scores run straight away. Middle scores wait for an admin to look. High scores are blocked before any tool runs.',
  },
  {
    icon: Ban,
    title: '4 · We stop or allow',
    body: 'Safe actions run in a sandbox. Risky actions are blocked, and money-moving tools the assistant was never given are always refused. Every decision is written to the audit log with its reasons.',
  },
]

export default function HowItWorks() {
  return (
    <div className="fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">How it works</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Four plain steps. No security jargon — if a word here is unfamiliar, it is explained where it is used.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s) => (
          <Card key={s.title} className="p-5">
            <s.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">{s.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.body}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">What the score means</h2>
        <div className="mt-3 space-y-2">
          {RISK_BANDS.map((b) => (
            <div key={b.level} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm">
              <span className="font-bold text-slate-800 dark:text-slate-200">{b.plain}</span>
              <span className="text-slate-600 dark:text-slate-400">
                {b.level === 'SAFE' && 'Ordinary request — the assistant runs it.'}
                {b.level === 'LOW' && 'Looks off, not clearly an attack — an admin checks it first.'}
                {b.level === 'HIGH' && 'Risky — the actions are blocked before they run.'}
                {b.level === 'CRITICAL' && 'A clear attack — everything risky is blocked.'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
          <XCircle className="h-5 w-5 text-red-500" /> What we never do
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <li>Never move real money or call a real payment service.</li>
          <li>Never send a real email — drafts only, and only inside the sandbox.</li>
          <li>Never read a real account, mailbox or file — all data is synthetic demo data.</li>
          <li>Never run a tool the assistant was not given. Money tools like transfers are not registered at all, so any attempt to call them is refused.</li>
          <li>Never hide a decision. Every allow, review and block is logged with its reasons.</li>
        </ul>
      </Card>
    </div>
  )
}
