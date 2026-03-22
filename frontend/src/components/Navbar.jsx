import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, LayoutDashboard, LogOut, ChevronDown, Plus, FileText } from 'lucide-react'
import { useAuthStore } from '../context/auth.js'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const location         = useLocation()
  const navigate         = useNavigate()
  const [open, setOpen]  = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navLink = (to, icon, label) => {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
          active
            ? 'bg-electric/10 text-electric border border-electric/20'
            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
        }`}
      >
        {React.createElement(icon, { className: 'w-4 h-4' })}
        {label}
      </Link>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-electric-gradient flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-text-primary">InterviewIQ</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLink('/dashboard', LayoutDashboard, 'Dashboard')}
          {navLink('/resume',    FileText,        'Resume')}
          <Link
            to="/dashboard"
            onClick={e => { e.preventDefault(); navigate('/dashboard', { state: { openModal: true } }) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
          >
            <Plus className="w-4 h-4" /> New Interview
          </Link>
        </div>

        {/* User menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-electric-gradient flex items-center justify-center text-white text-xs font-bold">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-text-secondary hidden md:block">
                {user.name?.split(' ')[0]}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 glass rounded-2xl border border-border-bright/60 shadow-card overflow-hidden z-20"
                >
                  <div className="p-3 border-b border-border/50">
                    <p className="text-text-primary text-sm font-medium">{user.name}</p>
                    <p className="text-text-muted text-xs truncate">{user.email}</p>
                    {user.streak > 0 && (
                      <p className="text-warning text-xs mt-1">🔥 {user.streak} day streak</p>
                    )}
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link
                      to="/resume"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
                    >
                      <FileText className="w-4 h-4" /> My Resume
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-danger/80 hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}