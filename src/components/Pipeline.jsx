import { motion } from 'framer-motion'
import { User, ScanSearch, Gauge, ShieldCheck, Bot, Wrench, GitFork } from 'lucide-react'

const NODES = [['User Input', User, 'Untrusted content'], ['Injection Detector', ScanSearch, 'Classifier + heuristics'], ['Risk Engine', Gauge, '0–100 explainable score'], ['Policy Engine', ShieldCheck, '9 runtime policies'], ['AI Agent', Bot, 'Sandboxed planner'], ['Tool Interceptor', Wrench, 'Every call gated'], ['Allow / Review / Block', GitFork, 'Decision + audit']]

export default function Pipeline({ compact }) {
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {NODES.map(([t, Icon, s], i) => (
          <motion.div key={t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="relative rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-center">
            <div className={`mx-auto grid h-10 w-10 place-items-center rounded-lg ring-1 ${i === 6 ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' : 'bg-blue-500/10 text-blue-300 ring-blue-500/25'}`}><Icon size={18} /></div>
            <div className="mt-2 text-xs font-semibold text-slate-100">{t}</div>
            {!compact && <div className="mt-0.5 text-[10px] text-slate-500">{s}</div>}
            {i < 6 && <div className="flow-line absolute -right-3 top-8 hidden h-px w-3 lg:block" />}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
