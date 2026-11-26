import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import SignIn from './pages/SignIn.jsx'
import Home from './pages/user/Home.jsx'
import MyRequests from './pages/user/MyRequests.jsx'
import RequestDetail from './pages/user/RequestDetail.jsx'
import HowItWorks from './pages/user/HowItWorks.jsx'
import AdminDashboard from './pages/admin/Dashboard.jsx'
import Queue from './pages/admin/Queue.jsx'
import AllRequests from './pages/admin/AllRequests.jsx'
import UserPanel from './pages/admin/UserPanel.jsx'
import Events from './pages/admin/Events.jsx'
import Policies from './pages/admin/Policies.jsx'
import { useStore } from './store.jsx'

export default function App() {
  const { session } = useStore()

  if (!session) return <SignIn />

  if (session.role === 'admin') {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/queue" element={<Queue />} />
          <Route path="/admin/requests" element={<AllRequests />} />
          <Route path="/admin/requests/:id" element={<RequestDetail />} />
          <Route path="/admin/users/:email" element={<UserPanel />} />
          <Route path="/admin/events" element={<Events />} />
          <Route path="/admin/policies" element={<Policies />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/requests" element={<MyRequests />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
