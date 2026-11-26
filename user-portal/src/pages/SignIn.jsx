import { Shield, User, ShieldCheck, ArrowRight } from 'lucide-react'
import { useStore } from '../store.jsx'

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
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-10">
      <div className="flex items-center gap-2.5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
          <Shield className="h-7 w-7" />
        </span>
        <span className="leading-tight">
          <span className="block text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Zer0-Neuro</span>
          <span className="block text-sm font-semibold text-blue-700 dark:text-blue-400">AgentShield</span>
        </span>
      </div>
      <h1 className="mt-6 text-center text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
        Your AI assistant, guarded.
      </h1>
      <p className="mt-2 max-w-xl text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
        AgentShield checks every request before your assistant acts. If a hidden instruction
        in a document or email tries to push it somewhere you did not ask, it gets stopped —
        and you get told why, in plain language.
      </p>

      <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
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

      <p className="mt-8 max-w-xl text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Demo accounts — no password, no sign-up. Pick a card to enter.
        Demo — synthetic data only. No real money, email, or data.
        Everything runs in your browser; switching accounts just changes whose panel you see.
      </p>
    </div>
  )
}
