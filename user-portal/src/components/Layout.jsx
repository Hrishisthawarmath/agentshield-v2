import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Shield, LogOut, Home, ListChecks, CircleHelp, FlaskConical, LayoutDashboard, Inbox, Users, ScrollText, ShieldCheck, Sun, Moon } from 'lucide-react'
import { useStore } from '../store.jsx'
import { currentTheme, applyTheme } from '../lib/theme.js'

function Brand({ home }) {
  return (
    <Link to={home} className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
        <Shield className="h-6 w-6" />
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Zer0-Neuro</span>
        <span className="block text-xs font-semibold text-blue-700 dark:text-blue-400">AgentShield</span>
      </span>
    </Link>
  )
}

const USER_NAV = [
  { to: '/', label: 'My Assistant', icon: Home, end: true },
  { to: '/requests', label: 'My Requests', icon: ListChecks },
  { to: '/lab', label: 'Prompt Lab', icon: FlaskConical },
  { to: '/how-it-works', label: 'How it works', icon: CircleHelp },
]

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/queue', label: 'Approval Queue', icon: Inbox },
  { to: '/admin/requests', label: 'All Requests', icon: Users },
  { to: '/admin/events', label: 'Events', icon: ScrollText },
  { to: '/admin/policies', label: 'Policies', icon: ShieldCheck },
]

export default function Layout() {
  const { session, signOut, store } = useStore()
  const [theme, setTheme] = useState(currentTheme)
  const isAdmin = session?.role === 'admin'
  const nav = isAdmin ? ADMIN_NAV : USER_NAV
  const awaiting = store.requests.filter((r) => r.status === 'awaiting').length
  const initials = (session?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 py-4">
        <Brand home={isAdmin ? '/admin' : '/'} />
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isAdmin ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'}`}>
            {isAdmin ? 'Admin' : 'Your account'}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 pl-1 pr-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{initials}</span>
            <span className="text-left leading-tight">
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{session?.name}</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">{session?.email}</span>
            </span>
          </span>
          <button
            type="button"
            className="btn btn-ghost !px-3"
            onClick={() => setTheme(applyTheme(theme === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button type="button" className="btn btn-ghost !px-3" onClick={signOut} title="Sign out / switch account">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-1 py-3" aria-label="Main">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}>
            <n.icon className="h-4 w-4" />
            {n.label}
            {n.to === '/admin/queue' && awaiting > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">{awaiting}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 pb-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        Demo — synthetic data only. No real money, email, or data. All checks run in your browser.
      </footer>
    </div>
  )
}
