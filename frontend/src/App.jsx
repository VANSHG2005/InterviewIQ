import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from './context/auth.js'

import Landing   from './pages/Landing.jsx'
import Login     from './pages/Login.jsx'
import Signup    from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Interview from './pages/Interview.jsx'
import Results   from './pages/Results.jsx'
import Resume    from './pages/Resume.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Admin       from './pages/Admin.jsx'
import NotFound    from './pages/NotFound.jsx'
import Navbar    from './components/Navbar.jsx'

function ProtectedRoute({ children }) {
  const { token, initialized } = useAuthStore()
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <div className="flex gap-2">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    )
  }
  return token ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { token } = useAuthStore()
  return token ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  const location = useLocation()
  const init = useAuthStore((s) => s.init)

  const isAuthPage = ['/login', '/signup'].includes(location.pathname)
  const isLanding  = location.pathname === '/'

  useEffect(() => { init() }, [])

  return (
    <div className="min-h-screen bg-void">
      {!isAuthPage && !isLanding && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/"              element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Landing /></motion.div>} />
          <Route path="/login"         element={<PublicRoute><motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><Login /></motion.div></PublicRoute>} />
          <Route path="/signup"        element={<PublicRoute><motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><Signup /></motion.div></PublicRoute>} />
          <Route path="/dashboard"     element={<ProtectedRoute><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Dashboard /></motion.div></ProtectedRoute>} />
          <Route path="/leaderboard"   element={<ProtectedRoute><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Leaderboard /></motion.div></ProtectedRoute>} />
          <Route path="/admin"         element={<ProtectedRoute><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Admin /></motion.div></ProtectedRoute>} />
          <Route path="/resume"        element={<ProtectedRoute><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Resume /></motion.div></ProtectedRoute>} />
          <Route path="/interview/:id" element={<ProtectedRoute><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Interview /></motion.div></ProtectedRoute>} />
          <Route path="/results/:id"   element={<ProtectedRoute><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}><Results /></motion.div></ProtectedRoute>} />
          <Route path="*"              element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}