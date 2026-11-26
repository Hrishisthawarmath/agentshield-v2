import { Shield, User, ShieldCheck, ArrowRight, Search, ListChecks } from 'lucide-react'
import { useStore } from '../store.jsx'

const FEATURES = [
  {
    icon: Search,
    title: 'Check',
    body: 'Every word is scanned for hidden instructions and scored 0–100.',
  },
  {
    icon: ListChecks,
    title: 'Explain',
    body: 'You see the score and the reason for every point — in plain English.',
  },
  {
    icon: ShieldCheck,
    title: 'Stop or allow',
    body: 'Safe requests run. Risky ones are blocked or sent to an admin first.',
  },
]

export default function SignIn() {
  const { accounts, signIn } = useStore()
  const cards = [
    {
      account: accounts.user,
      icon: User,
      title: 'Demo User',
      desc: 'See your own requests, check a new one, and watch what the assistant does — in plain language.',
      cta: 'Continue as Demo User',
    },
    {
      account: accounts.admin,
      icon: ShieldCheck,
      title: 'Admin',
      desc: 'See every user’s requests, approve or deny the ones waiting, and review the full audit log.',
      cta: 'Continue as Admin',
    },
  ]
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-12">
      <div className="flex items-center gap-2.5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
          <Shield className="h-7 w-7" />
        </span>
        <span className="leading-tight">
          <span className="block text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Zer0-Neuro</span>
          <span className="block text-sm font-semibold text-blue-700 dark:text-blue-400">AgentShield</span>
        </span>
      </div>

      <h1 className="mt-8 max-w-2xl text-center text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
        Your AI assistant, <span className="gradient-text">guarded.</span>
      </h1>
      <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
        AgentShield checks every request before your assistant acts. If a hidden instruction
        in a document or email tries to push it somewhere you did not ask, it gets stopped —
        and you get told why, in plain language.
      </p>

      <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.account.email}
            type="button"
            onClick={() => signIn(c.account)}
            className="card card-hover p-6 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-100">
              <c.icon className="h-6 w-6" />
            </span>
            <span className="mt-3 block text-lg font-bold text-slate-900 dark:text-slate-100">{c.title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-600 dark:text-slate-400">{c.desc}</span>
            <span className="mt-3 block font-mono text-xs text-slate-500 dark:text-slate-400">{c.account.email}</span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 dark:text-blue-400">
              {c.cta} <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-4">
            <f.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{f.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-xl text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Demo accounts — no password, no sign-up. Pick a card to enter.
        Demo — synthetic data only. No real money, email, or data.
        Everything runs in your browser; switching accounts just changes whose panel you see.
      </p>
    </div>
  )
}
