import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain, Play, TrendingUp, Award, Flame,
  Plus, ChevronRight, BarChart2,
  Code2, MessageSquare, Building2, Users, Loader2,
  Trash2, RotateCcw, ExternalLink, FileText,
  Zap, Trophy, Target, Sparkles
} from 'lucide-react'
import { apiFetch, useAuthStore } from '../context/auth.js'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { format, isValid } from 'date-fns'
import toast from 'react-hot-toast'

import SkillGapAnalyzer from '../components/dashboard/SkillGapAnalyzer.jsx'
import LearningRoadmap from '../components/dashboard/LearningRoadmap.jsx'

const TYPES = [
  { id: 'technical',  label: 'Technical',     icon: Code2,         color: '#4f8ef7', desc: 'DS, Algorithms, System Design' },
  { id: 'behavioral', label: 'Behavioral',    icon: MessageSquare, color: '#a78bfa', desc: 'STAR method, Leadership' },
  { id: 'hr',         label: 'HR Round',      icon: Users,         color: '#22d3ee', desc: 'Culture fit, Compensation' },
  { id: 'company',    label: 'Company Style', icon: Building2,     color: '#10b981', desc: 'Google, Amazon, Meta…' },
]

const COMPANIES = ['Google', 'Amazon', 'Meta', 'Apple', 'Microsoft', 'Netflix', 'Stripe', 'Airbnb']

const BADGES = {
  first_interview: { label: 'First Interview', icon: '🎯', color: '#f59e0b' },
  streak_3:        { label: '3-day Streak',     icon: '🔥', color: '#ef4444' },
  high_scorer:     { label: 'High Scorer',      icon: '⭐', color: '#a78bfa' },
  consistent:      { label: 'Consistent',       icon: '📈', color: '#10b981' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 border border-border-bright text-xs">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-mono font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

const scoreColor = (s) => s >= 8 ? '#10b981' : s >= 6 ? '#f59e0b' : '#ef4444'

export default function Dashboard() {
  const { user }      = useAuthStore()
  const navigate      = useNavigate()
  const [interviews,  setInterviews]  = useState([])
  const [stats,       setStats]       = useState(null)
  const [resumes,     setResumes]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [newIv,       setNewIv]       = useState({ type: 'technical', company: '', resumeId: '' })
  const [starting,    setStarting]    = useState(false)
  const [deletingId,  setDeletingId]  = useState(null)
  const [confirmId,   setConfirmId]   = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [ivData, stData] = await Promise.all([
          apiFetch('/api/interviews?limit=10'),
          apiFetch('/api/interviews/stats'),
        ])
        setInterviews(ivData.interviews || [])
        setStats(stData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const startInterview = async () => {
    if (newIv.type === 'company' && !newIv.company) {
      toast.error('Select a company first')
      return
    }
    setStarting(true)
    try {
      const body = { type: newIv.type, company: newIv.company }
      if (newIv.resumeId) body.resumeId = newIv.resumeId
      
      const data = await apiFetch('/api/interviews', {
        method: 'POST',
        body:   JSON.stringify(body),
      })
      navigate(`/interview/${data.interview._id}`)
    } catch (err) {
      toast.error(err.message || 'Could not start interview')
      setStarting(false)
    }
  }

  const openModal = async () => {
    try {
      const listData = await apiFetch('/api/resume/list')
      setResumes(listData.resumes || [])
      // Auto-select active resume
      const activeResume = listData.resumes?.find(r => r.isActive)
      if (activeResume) {
        setNewIv(prev => ({ ...prev, resumeId: activeResume._id }))
      }
    } catch (err) {
      console.error('Could not fetch resumes:', err)
    }
    setShowModal(true)
  }

  const deleteInterview = async (id) => {
    setDeletingId(id)
    try {
      await apiFetch(`/api/interviews/${id}`, { method: 'DELETE' })
      setInterviews(prev => prev.filter(iv => iv._id !== id))
      toast.success('Interview deleted')
    } catch (err) {
      toast.error('Could not delete interview')
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  const chartData = (stats?.scoreHistory || []).map(iv => {
    const d = new Date(iv.date)
    return {
      date:  iv.date && isValid(d) ? format(d, 'MMM d') : '—',
      Score: iv.score,
      Type:  iv.type,
    }
  })

  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center pt-16">
      <div className="flex gap-2">
        <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
      </div>
    </div>
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const nextLevelXP = 1000
  const currentXP = stats?.totalPoints % 1000
  const xpProgress = (currentXP / nextLevelXP) * 100

  return (
    <div className="min-h-screen bg-void pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <p className="text-text-secondary text-sm mb-1">{greeting},</p>
            <div className="flex items-center gap-4">
              <h1 className="font-display text-4xl font-bold text-text-primary">
                {user?.name?.split(' ')[0]} 👋
              </h1>
              <div className="flex items-center gap-2 bg-white/5 border border-border/40 px-3 py-1 rounded-full">
                <div className="w-6 h-6 rounded-full bg-neon/20 flex items-center justify-center text-[10px] font-bold text-neon border border-neon/30">
                  {stats?.level || 1}
                </div>
                <div className="w-24 bg-void/50 h-1.5 rounded-full overflow-hidden border border-border/20">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    className="h-full bg-neon-gradient shadow-[0_0_10px_rgba(16,233,181,0.5)]"
                  />
                </div>
                <span className="text-[10px] text-text-muted font-mono">{currentXP} / {nextLevelXP} XP</span>
              </div>
            </div>
            {user?.skills?.length > 0 && (
              <p className="text-text-muted text-sm mt-2">
                Expertise: <span className="text-electric">{user.skills.slice(0, 5).join(', ')}</span>
                {user.skills.length > 5 && ` +${user.skills.length - 5} more`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right mr-4 hidden md:block">
                <div className="flex items-center gap-1.5 text-neon font-bold font-mono text-lg">
                  <Zap className="w-4 h-4 fill-neon" /> {stats?.points || 0}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Credits</div>
             </div>
             <button onClick={openModal} className="btn-primary glow-electric">
               <Plus className="w-4 h-4" /> New Session
             </button>
          </div>
        </motion.div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Interviews', value: stats?.total    || 0,                   icon: Brain,    color: '#4f8ef7' },
            { label: 'Global Average',   value: `${(stats?.avgScore  || 0).toFixed(1)}/10`, icon: Target,   color: '#22d3ee' },
            { label: 'Current Streak',   value: `${stats?.streak || 0}d`,              icon: Flame,    color: '#ef4444' },
            { label: 'All-time Best',    value: `${(stats?.bestScore || 0).toFixed(1)}/10`, icon: Trophy,   color: '#a78bfa' },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-5 group relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle at top right, ${color}15, transparent 70%)` }} />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '15' }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="font-display text-2xl font-bold text-text-primary">{value}</div>
              <div className="text-text-muted text-xs mt-1">{label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* ── Score trend ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="lg:col-span-2 glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-semibold text-text-primary">Performance Trend</h2>
                <p className="text-xs text-text-muted mt-1">Your overall score progression over last 10 sessions</p>
              </div>
              <TrendingUp className="w-5 h-5 text-electric opacity-50" />
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2538" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#4a5580', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#4a5580', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="Score" 
                    stroke="#4f8ef7" 
                    fill="url(#gScore)" 
                    strokeWidth={3} 
                    dot={{ fill: '#4f8ef7', strokeWidth: 2, r: 4, stroke: '#void' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-text-muted gap-2">
                <TrendingUp className="w-8 h-8 opacity-30" />
                <p className="text-sm">Complete an interview to see your trend</p>
              </div>
            )}
          </motion.div>

          {/* ── Badges/Achievements ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}
            className="glass rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-text-primary">Achievements</h2>
              <Trophy className="w-4 h-4 text-warning opacity-50" />
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(BADGES).map(([key, { label, icon, color }]) => {
                const earned = stats?.badges?.includes(key)
                return (
                  <div key={key} className={`flex flex-col items-center text-center p-3 rounded-xl transition-all border ${earned ? 'bg-white/5 border-border-bright' : 'opacity-30 border-border/40 grayscale'}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2"
                      style={{ background: earned ? color + '20' : 'transparent', border: `1px solid ${color}40` }}>
                      {icon}
                    </div>
                    <p className="text-[10px] font-bold text-text-primary uppercase tracking-tight leading-tight">{label}</p>
                    <p className="text-[8px] text-text-muted mt-1 uppercase tracking-widest">{earned ? 'Unlocked' : 'Locked'}</p>
                  </div>
                )
              })}
            </div>
            <Link to="/leaderboard" className="mt-4 text-[11px] text-electric font-bold flex items-center justify-center gap-1 hover:gap-2 transition-all">
              GLOBAL LEADERBOARD <ChevronRight className="w-3 h-3" />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Module 10: Skill Gap Analyzer */}
          <SkillGapAnalyzer gaps={stats?.skillGaps} concepts={stats?.missingConcepts} />
          
          {/* Module 11: Learning Roadmap */}
          <LearningRoadmap roadmap={stats?.latestRoadmap} />
        </div>

        {/* ── History ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="glass rounded-2xl p-6 mt-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-text-primary">Recent Sessions</h2>
            <Link to="/interviews" className="text-text-muted text-xs hover:text-text-secondary transition-colors">View all sessions →</Link>
          </div>

          {interviews.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
              <p className="text-text-secondary font-medium mb-1">No interviews yet</p>
              <p className="text-text-muted text-sm mb-4">Start a session to see your history here.</p>
              <button onClick={openModal} className="btn-primary text-sm py-2 px-5 mx-auto">
                <Plus className="w-3.5 h-3.5" /> Start Interview
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {interviews.map((iv) => {
                const type       = TYPES.find(t => t.id === iv.type) || TYPES[0]
                const isDeleting = deletingId === iv._id
                const isConfirm  = confirmId  === iv._id

                return (
                  <div
                    key={iv._id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-void/40 hover:border-border-bright hover:bg-void/60 transition-all"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: type.color + '20' }}>
                      <type.icon className="w-5 h-5" style={{ color: type.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-text-primary text-sm capitalize">{iv.type} Interview</p>
                        {iv.company && (
                          <span className="text-[10px] text-text-muted bg-border px-2 py-0.5 rounded-full uppercase tracking-tighter">{iv.company}</span>
                        )}
                        {!iv.completed && (
                          <span className="text-[10px] text-warning bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20 uppercase tracking-tighter">
                            In progress
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-[11px] mt-0.5">
                        {iv.createdAt ? format(new Date(iv.createdAt), 'MMM d, yyyy · h:mm a') : '—'}
                      </p>
                    </div>

                    {/* Score */}
                    {iv.scores?.overall != null && (
                      <div className="text-right flex-shrink-0 mr-4">
                        <div className="font-mono font-bold text-sm" style={{ color: scoreColor(iv.scores.overall) }}>
                          {iv.scores.overall.toFixed(1)}/10
                        </div>
                        <div className="text-text-muted text-[10px] uppercase tracking-widest">Score</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">

                      {/* Resume button — in-progress only */}
                      {!iv.completed && (
                        <button
                          onClick={() => navigate(`/interview/${iv._id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-electric/15 text-electric border border-electric/30 hover:bg-electric/25 transition-all"
                        >
                          <RotateCcw className="w-3 h-3" /> Resume
                        </button>
                      )}

                      {/* View report — completed only */}
                      {iv.completed && (
                        <button
                          onClick={() => navigate(`/results/${iv._id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-text-secondary border border-border hover:border-border-bright hover:text-text-primary transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> Report
                        </button>
                      )}

                      {/* Delete — confirm on first click */}
                      {isConfirm ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => deleteInterview(iv._id)}
                            disabled={isDeleting}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30 transition-all"
                          >
                            {isDeleting
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <><Trash2 className="w-3 h-3" /> Confirm</>
                            }
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-secondary border border-border hover:border-border-bright transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(iv._id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                          title="Delete interview"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── New Interview Modal ── */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm px-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="glass-bright rounded-3xl p-8 w-full max-w-lg shadow-card border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-electric-gradient flex items-center justify-center shadow-lg shadow-electric/20">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold text-text-primary">Start new session</h2>
            </div>

            <div className="mb-6">
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-3 font-semibold">Select Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {TYPES.map(({ id, label, icon: Icon, color, desc }) => (
                  <button
                    key={id}
                    onClick={() => setNewIv({ ...newIv, type: id, company: '' })}
                    className="p-4 rounded-xl border text-left transition-all relative group overflow-hidden"
                    style={newIv.type === id
                      ? { borderColor: color, backgroundColor: color + '10' }
                      : { borderColor: '#1e2538', backgroundColor: 'transparent' }}
                  >
                    {newIv.type === id && (
                      <motion.div layoutId="activeType" className="absolute inset-0 bg-white/[0.03]" />
                    )}
                    <Icon className="w-5 h-5 mb-2 transition-transform group-hover:scale-110" style={{ color }} />
                    <p className="font-semibold text-text-primary text-sm">{label}</p>
                    <p className="text-text-muted text-[10px] mt-1 leading-tight">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {resumes.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-3 font-semibold">Select Profile Context</label>
                <select
                  value={newIv.resumeId}
                  onChange={e => setNewIv({ ...newIv, resumeId: e.target.value })}
                  className="w-full bg-void/60 border border-border focus:border-electric rounded-xl px-4 py-3 text-text-primary text-sm transition-all appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%234a5580\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                >
                  <option value="">Standard (General Practice)</option>
                  {resumes.map(resume => (
                    <option key={resume._id} value={resume._id}>
                      {resume.fileName} {resume.isActive ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {newIv.type === 'company' && (
              <div className="mb-6">
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-3 font-semibold">Target Company</label>
                <div className="flex flex-wrap gap-2">
                  {COMPANIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewIv({ ...newIv, company: c })}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all uppercase tracking-wider"
                      style={newIv.company === c
                        ? { borderColor: '#4f8ef7', backgroundColor: 'rgba(79,142,247,0.15)', color: '#4f8ef7' }
                        : { borderColor: '#1e2538', backgroundColor: 'transparent', color: '#8892b0' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center py-3">Cancel</button>
              <button
                onClick={startInterview}
                disabled={starting}
                className="btn-primary flex-1 justify-center py-3 glow-electric font-bold"
              >
                {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Start Interview</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}