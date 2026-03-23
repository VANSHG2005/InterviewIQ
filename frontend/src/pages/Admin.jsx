import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Users, Brain, BarChart3, TrendingUp, Shield, 
  Search, ExternalLink, Calendar, Mail, Award,
  Loader2, AlertCircle, Home, ChevronRight
} from 'lucide-react'
import { apiFetch, useAuthStore } from '../context/auth.js'
import { format, isValid } from 'date-fns'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard')
      return
    }

    const load = async () => {
      try {
        const [sData, uData, iData] = await Promise.all([
          apiFetch('/api/admin/stats'),
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/interviews'),
        ])
        setStats(sData)
        setUsers(uData.users || [])
        setInterviews(iData.interviews || [])
      } catch (err) {
        setError(err.message || 'Failed to load admin data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, navigate])

  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-electric animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Admin Access Error</h2>
        <p className="text-text-secondary mb-6">{error}</p>
        <Link to="/dashboard" className="btn-primary">Return to Dashboard</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-void pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-widest mb-2">
              <Shield className="w-3.5 h-3.5" /> System Administration
            </div>
            <h1 className="font-display text-4xl font-bold text-text-primary">Admin Overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="btn-ghost text-xs">
              <Home className="w-4 h-4" /> Back to App
            </Link>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: '#4f8ef7', trend: `+${stats?.growth?.newUsers || 0} this month` },
            { label: 'Completed Interviews', value: stats?.totalInterviews || 0, icon: Brain, color: '#10b981', trend: `+${stats?.growth?.newInterviews || 0} this month` },
            { label: 'AI Reports Generated', value: stats?.totalReports || 0, icon: BarChart3, color: '#a78bfa', trend: 'Active' },
            { label: 'System Health', value: '100%', icon: Shield, color: '#22d3ee', trend: 'Optimal' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.color + '15' }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-text-primary">{stat.value}</div>
              <div className="text-sm text-text-secondary mt-1">{stat.label}</div>
              <div className="text-[10px] text-text-muted mt-3 uppercase tracking-widest font-bold">{stat.trend}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent Users Table */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-3xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between">
              <h2 className="font-display font-bold text-text-primary">Recent Users</h2>
              <button className="text-xs text-electric hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-text-muted">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Level</th>
                    <th className="px-6 py-3">Interviews</th>
                    <th className="px-6 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-void border border-border/40 flex items-center justify-center text-xs font-bold text-text-secondary">
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{u.name}</p>
                            <p className="text-[10px] text-text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-text-secondary">Lv.{u.level || 1}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-text-primary">{u.totalInterviews || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-text-muted">
                          {u.createdAt && isValid(new Date(u.createdAt)) ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recent Activity List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-text-primary">System Activity</h2>
              <div className="flex items-center gap-1.5 text-[10px] text-success bg-success/10 px-2 py-1 rounded-full border border-success/20 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
              </div>
            </div>
            <div className="space-y-4">
              {interviews.map((iv) => (
                <div key={iv._id} className="flex items-start gap-4 p-4 rounded-2xl bg-void/40 border border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-electric/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-electric" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-text-primary truncate">{iv.userId?.name || 'Unknown User'}</p>
                      <span className="text-[10px] text-text-muted font-mono">{format(new Date(iv.completedAt), 'HH:mm')}</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Completed a <span className="text-electric font-medium uppercase tracking-tighter">{iv.type}</span> session
                      {iv.company && ` for ${iv.company}`}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                       <div className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-warning" />
                          <span className="text-[10px] font-bold text-text-primary">{(iv.scores?.overall || 0).toFixed(1)}/10</span>
                       </div>
                       <Link to={`/results/${iv._id}`} className="text-[10px] text-electric font-bold flex items-center gap-0.5 hover:gap-1 transition-all">
                          VIEW REPORT <ExternalLink className="w-2.5 h-2.5" />
                       </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 rounded-xl border border-border/40 text-xs font-bold text-text-muted hover:bg-white/5 hover:text-text-primary transition-all uppercase tracking-widest">
              Load more activity
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
