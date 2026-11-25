import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, ScanSearch, Gauge, Lock, ShieldCheck, ArrowRight, FlaskConical, LayoutDashboard, FileWarning, Mail, Globe, Bot } from 'lucide-react'
import Pipeline from '../components/Pipeline.jsx'
import { useMetrics } from '../store.jsx'
import { modelInfo } from '../engine/core.js'

const CAPS = [
  [ScanSearch, 'Detect', 'Find direct, indirect and obfuscated prompt injections in prompts, documents, emails and web pages.'],
  [Gauge, 'Analyze', 'Score every request 0–100 with explainable signals, attack type and severity.'],
  [Lock, 'Control', 'Intercept every AI tool call and enforce runtime security policies before execution.'],
  [ShieldCheck, 'Protect', 'Stop unauthorized payments, data exfiltration and compromised-agent behaviour.'],
]
const THREATS = [[FileWarning, 'Hidden text in invoices & PDFs'], [Mail, 'Malicious instructions in emails'], [Globe, 'Poisoned web pages'], [Bot, 'Agents exceeding their authority']]

export default function Landing() {
  const m = useMetrics()
  return (
    <div className="min-h-screen bg-grid">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30"><Shield size={18} className="text-white" /></span><div><div className="font-semibold text-white">AgentShield</div><div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">AI Agent Runtime Security</div></div></div>
        <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex"><Link to="/architecture" className="hover:text-white">Architecture</Link><Link to="/policies" className="hover:text-white">Policies</Link><Link to="/about" className="hover:text-white">About</Link>
          <Link to="/dashboard" className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-white ring-1 ring-white/10 hover:bg-white/10">Open Console</Link></nav>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 text-center md:pt-20">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />AI in Cybersecurity & Fintech · Zer0-Neuro · AVISHKAR'26</motion.div>
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
          Stop Prompt Injection <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Before Your AI Agent Acts.</span></motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mx-auto mt-5 max-w-2xl text-base text-slate-400 md:text-lg">
          AgentShield detects malicious instructions, evaluates risk, validates tool calls and blocks unauthorized AI actions in banking and fintech workflows — in real time, with an explainable audit trail.</motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500"><LayoutDashboard size={16} />Launch Security Console<ArrowRight size={16} /></Link>
          <Link to="/simulator" className="inline-flex items-center gap-2 rounded-lg bg-white/[0.05] px-5 py-3 text-sm font-semibold text-slate-100 ring-1 ring-white/10 hover:bg-white/10"><FlaskConical size={16} />Run Attack Simulation</Link>
        </motion.div>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[[m.requests, 'Requests scanned'], [m.threats, 'Threats detected'], [m.blocked, 'Actions blocked'], [modelInfo.cvF1, 'Classifier CV-F1']].map(([v, l]) => (
            <div key={l} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"><div className="font-mono text-2xl font-bold text-white">{v}</div><div className="text-[11px] text-slate-500">{l}</div></div>))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="glass rounded-2xl p-6"><div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Runtime protection pipeline</div><Pipeline /></div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {CAPS.map(([Icon, t, d], i) => (
          <motion.div key={t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="glass rounded-2xl p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/25"><Icon size={18} /></span>
            <h3 className="mt-4 text-lg font-semibold text-white">{t}</h3><p className="mt-1.5 text-sm text-slate-400">{d}</p>
          </motion.div>))}
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-8 px-5 pb-20 lg:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">The problem</div>
          <h2 className="mt-2 text-3xl font-bold text-white">To an AI model, hidden instructions look like legitimate data.</h2>
          <p className="mt-3 text-slate-400">Banks are adopting AI agents that read documents, emails and web pages, then call tools such as payment lookups or email drafts. One poisoned invoice can push an agent to act beyond its authority — at machine speed.</p>
          <p className="mt-3 text-sm text-slate-500">Prototype uses mock tools and synthetic data only — no real payment APIs. Defensive and detective controls only.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">{THREATS.map(([Icon, t]) => <div key={t} className="glass flex items-center gap-3 rounded-xl p-4"><Icon className="shrink-0 text-red-400" size={18} /><span className="text-sm text-slate-200">{t}</span></div>)}</div>
      </section>
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">AgentShield · Team Zer0-Neuro · AVISHKAR'26 — Adichunchanagiri Institute of Technology, Chikkamagaluru</footer>
    </div>
  )
}
