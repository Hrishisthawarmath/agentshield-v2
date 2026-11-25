import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'

const Landing = lazy(() => import('./pages/Landing.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Simulator = lazy(() => import('./pages/Simulator.jsx'))
const Agent = lazy(() => import('./pages/Agent.jsx'))
const Tools = lazy(() => import('./pages/Tools.jsx'))
const Policies = lazy(() => import('./pages/Policies.jsx'))
const Events = lazy(() => import('./pages/Events.jsx'))
const Architecture = lazy(() => import('./pages/Architecture.jsx'))
const About = lazy(() => import('./pages/About.jsx'))

const Loading = () => <div className="p-10 text-sm text-slate-500" role="status">Loading…</div>

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/events" element={<Events />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/about" element={<About />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
