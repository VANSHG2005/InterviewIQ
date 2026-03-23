import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Target, BookOpen, ChevronRight, Award,
  AlertTriangle, CheckCircle2, RotateCcw, Home,
  Loader2, Lightbulb, Calendar, Zap, Sparkles
} from 'lucide-react'
import { apiFetch } from '../context/auth.js'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts'

// ── Animated SVG score ring ────────────────────────────────────────────────────
function ScoreRing({ score, label, color, size = 120 }) {
  const r            = (size - 18) / 2
  const circumference = 2 * Math.PI * r
  const filled        = (score / 10) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2538" strokeWidth={8} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - filled }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-display font-bold text-text-primary"
            style={{ fontSize: size > 110 ? '1.75rem' : '1.25rem' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {typeof score === 'number' ? score.toFixed(1) : '—'}
          </motion.span>
          <span className="text-text-muted font-mono" style={{ fontSize: '0.65rem' }}>/10</span>
        </div>
      </div>
      <span className="text-text-secondary text-xs text-center leading-snug">{label}</span>
    </div>
  )
}

const WEEK_COLORS = ['#4f8ef7', '#22d3ee', '#a78bfa', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899']

const scoreColor = (s) => s >= 8 ? '#10b981' : s >= 6 ? '#f59e0b' : '#ef4444'

export default function Results() {
  const { id }                   = useParams()
  const navigate                 = useNavigate()
  const [report,   setReport]    = useState(null)
  const [interview,setInterview] = useState(null)
  const [loading,  setLoading]   = useState(true)
  const [error,    setError]     = useState(null)
  const [showPoints, setShowPoints] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [rData, iData] = await Promise.all([
          apiFetch(`/api/reports/${id}`),
          apiFetch(`/api/interviews/${id}`),
        ])
        if (!rData.report) throw new Error('Report data is missing')
        setReport(rData.report)
        setInterview(iData.interview)
        
        // Show points animation if just completed
        if (sessionStorage.getItem(`completed_${id}`)) {
          setShowPoints(true)
          sessionStorage.removeItem(`completed_${id}`)
        }
      } catch (err) {
        console.error(err)
        setError(err.message || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center pt-16">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-electric animate-spin mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Compiling your report…</p>
      </div>
    </div>
  )

  if (error || !report) return (
    <div className="min-h-screen bg-void flex items-center justify-center pt-16">
      <div className="text-center px-6">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Report Not Found</h2>
        <p className="text-text-secondary mb-6 max-w-sm mx-auto">
          {error || 'This report may still be generating or you don\'t have permission to view it.'}
        </p>
        <Link to="/dashboard" className="btn-primary">
          <Home className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  )

  const s       = report.scores || {}
  const overall = s.overall || 0

  const radarData = [
    { subject: 'Technical',     value: (s.technical     || 0) * 10 },
    { subject: 'Communication', value: (s.communication || 0) * 10 },
    { subject: 'Confidence',    value: (s.confidence    || 0) * 10 },
    { subject: 'Depth',         value: (s.depth         || 0) * 10 },
    { subject: 'Problem Solving', value: (s.problemSolving || 0) * 10 },
  ]

  return (
    <div className="min-h-screen bg-void pt-20 pb-16 relative">

      {/* ── Points Overlay ── */}
      <AnimatePresence>
        {showPoints && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 backdrop-blur-md"
            onClick={() => setShowPoints(false)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="glass-bright p-10 rounded-[3rem] text-center border-2 border-neon/30 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-neon/5 animate-pulse" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-neon-gradient flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,233,181,0.3)]">
                  <Zap className="w-10 h-10 text-white fill-white" />
                </div>
                <h2 className="text-3xl font-display font-bold text-text-primary mb-2">Score Awarded!</h2>
                <div className="text-5xl font-mono font-black text-neon mb-6">+{Math.floor(overall * 10) + 50} XP</div>
                <div className="flex justify-center gap-1.5 mb-8">
                   {[1,2,3].map(i => <Sparkles key={i} className="w-5 h-5 text-neon animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
                <button 
                  onClick={() => setShowPoints(false)}
                  className="btn-primary py-3 px-10 glow-neon text-sm font-bold uppercase tracking-widest"
                >
                  CONTINUE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-text-muted text-sm mb-6">
          <Link to="/dashboard" className="hover:text-text-secondary transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Interview Report</span>
        </div>

        {/* Title row */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-text-primary mb-2">Interview Report</h1>
            <p className="text-text-secondary text-sm">
              {interview?.type && <span className="capitalize">{interview.type}</span>}
              {interview?.company && ` · ${interview.company}`}
              {interview?.questions?.length && ` · ${interview.questions.length} questions`}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard" className="btn-ghost text-sm py-2 px-4 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </Link>
            <Link to="/dashboard" className="btn-primary text-sm py-2 px-4">
              Dashboard <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* ── Score overview ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-8 mb-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-electric-gradient" />
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* Overall ring */}
            <div className="text-center">
              <ScoreRing score={overall} label="Overall Score" color={scoreColor(overall)} size={148} />
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  overall >= 8 ? 'bg-success/15 text-success' :
                  overall >= 6 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'
                }`}>
                  {overall >= 8
                    ? <><CheckCircle2 className="w-3 h-3" /> Strong performance</>
                    : overall >= 6
                    ? <><Award className="w-3 h-3" /> Good effort</>
                    : <><AlertTriangle className="w-3 h-3" /> Needs improvement</>
                  }
                </span>
              </div>
            </div>
            {/* Sub-scores */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { key: 'technical',     label: 'Technical',      color: '#4f8ef7' },
                { key: 'communication', label: 'Communication',  color: '#22d3ee' },
                { key: 'confidence',    label: 'Confidence',     color: '#a78bfa' },
                { key: 'depth',         label: 'Answer Depth',   color: '#10b981' },
              ].map(({ key, label, color }) => (
                <ScoreRing key={key} score={s[key] || 0} label={label} color={color} size={100} />
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Radar + AI Summary ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="font-display font-semibold text-text-primary mb-4">Skill Radar</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e2538" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4a5580', fontSize: 11 }} />
                <Radar dataKey="value" stroke="#4f8ef7" fill="#4f8ef7" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: '#141928', border: '1px solid #2a3350', borderRadius: '12px', fontSize: '12px' }}
                  formatter={v => [`${(v / 10).toFixed(1)}/10`]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 }}
            className="glass rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-electric" />
              <h2 className="font-display font-semibold text-text-primary">AI Feedback</h2>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed flex-1">
              {report.aiSummary || 'Your performance showed solid foundational knowledge. Review the question breakdown below for specific improvement areas.'}
            </p>
            {report.strengths?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Strengths</p>
                <div className="flex flex-wrap gap-2">
                  {report.strengths?.map((str, i) => (
                    <span key={i} className="text-xs bg-success/10 text-success border border-success/20 px-2 py-1 rounded-lg">
                      {str}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Question Breakdown ── */}
        {report.questionBreakdown?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="glass rounded-2xl p-6 mb-5"
          >
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-4 h-4 text-cyan" />
              <h2 className="font-display font-semibold text-text-primary">Question Breakdown</h2>
            </div>
            <div className="space-y-4">
              {report.questionBreakdown?.map((item, i) => (
                <div key={i} className="bg-void/40 rounded-xl p-4 border border-border/40">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-text-muted text-xs font-mono mb-1">Q{i + 1}</p>
                      <p className="text-text-primary text-sm font-medium leading-snug">{item.question}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="font-mono font-bold text-sm" style={{ color: scoreColor(item.score || 0) }}>
                        {item.score || 0}/10
                      </div>
                    </div>
                  </div>
                  {item.feedback && (
                    <div className="bg-electric/5 rounded-lg p-3 border-l-2 border-electric/40 mb-2">
                      <p className="text-text-secondary text-xs leading-relaxed">{item.feedback}</p>
                    </div>
                  )}
                  {item.idealAnswer && (
                    <details className="group">
                      <summary className="text-xs text-electric cursor-pointer hover:text-electric-glow transition-colors flex items-center gap-1 select-none">
                        <Lightbulb className="w-3 h-3" /> Show ideal answer
                      </summary>
                      <p className="text-text-muted text-xs mt-2 leading-relaxed pl-4 border-l border-border">
                        {item.idealAnswer}
                      </p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Skill Gaps ── */}
        {report.weakTopics?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}
            className="glass rounded-2xl p-6 mb-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h2 className="font-display font-semibold text-text-primary">Skill Gaps</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.weakTopics?.map((topic, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20">
                  <div className="w-6 h-6 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-warning text-xs font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-text-primary text-sm font-medium">{topic.topic}</p>
                    {topic.description && (
                      <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{topic.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Learning Roadmap ── */}
        {report.roadmap?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-4 h-4 text-neon" />
              <h2 className="font-display font-semibold text-text-primary">Your Learning Roadmap</h2>
            </div>
            <div className="space-y-3">
              {report.roadmap?.map((week, i) => {
                const c = WEEK_COLORS[i % WEEK_COLORS.length]
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.38 + i * 0.06 }}
                    className="flex gap-4 items-start p-4 rounded-xl border border-border/40 bg-void/30 hover:border-border-bright transition-all"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                      style={{ background: c + '20', border: `1px solid ${c}40`, color: c }}>
                      W{i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-text-primary text-sm mb-1">{week.title}</p>
                      <p className="text-text-muted text-xs leading-relaxed">{week.description}</p>
                      {week.resources?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {week.resources?.map((r, j) => (
                            <span key={j} className="text-xs bg-border/60 text-text-secondary px-2 py-0.5 rounded-md flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />{r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
