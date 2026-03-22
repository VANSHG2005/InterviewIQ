import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileText, Trash2, CheckCircle2, AlertTriangle,
  Loader2, Code2, Briefcase, GraduationCap, FolderGit2,
  Plus, X, Pencil, Save, Brain, ChevronDown, ChevronUp,
  RefreshCw, Sparkles,
} from 'lucide-react'
import { apiFetch, useAuthStore } from '../context/auth.js'
import toast from 'react-hot-toast'

const BASE = import.meta.env.VITE_API_URL || ''

// ── small tag chip ─────────────────────────────────────────────────────────────
function Tag({ label, color = '#4f8ef7', onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
      style={{ background: color + '15', borderColor: color + '40', color }}
    >
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-70 transition-opacity">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

// ── collapsible section wrapper ────────────────────────────────────────────────
function Section({ icon: Icon, title, color, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: color + '20', border: `1px solid ${color}40` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="font-display font-semibold text-text-primary">{title}</span>
          {count != null && (
            <span className="text-xs bg-border text-text-muted px-2 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-text-muted" />
          : <ChevronDown className="w-4 h-4 text-text-muted" />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border/40 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── tag editor (skills / technologies) ─────────────────────────────────────────
function TagEditor({ items, color, placeholder, onChange }) {
  const [input, setInput]   = useState('')
  const [editing, setEditing] = useState(false)
  const inputRef             = useRef(null)

  const add = () => {
    const val = input.trim()
    if (!val || items.includes(val)) { setInput(''); return }
    onChange([...items, val])
    setInput('')
  }

  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map((item, i) => (
          <Tag key={i} label={item} color={color} onRemove={editing ? () => remove(i) : null} />
        ))}
        {items.length === 0 && (
          <p className="text-text-muted text-sm">None extracted — add manually below</p>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder={placeholder}
            className="flex-1 bg-void/60 border border-border focus:border-electric rounded-xl px-3 py-2 text-text-primary placeholder:text-text-muted text-sm transition-all"
          />
          <button onClick={add} className="btn-primary py-2 px-4 text-sm">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <button onClick={() => setEditing(false)} className="btn-ghost py-2 px-3 text-sm">Done</button>
        </div>
      ) : (
        <button
          onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-electric transition-colors"
        >
          <Pencil className="w-3 h-3" /> Edit manually
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Resume() {
  const { user, token }                    = useAuthStore()
  const navigate                           = useNavigate()
  const [data,        setData]         = useState(null)
  const [resumes,     setResumes]      = useState([])
  const [loading,     setLoading]      = useState(true)
  const [uploading,   setUploading]    = useState(false)
  const [saving,      setSaving]       = useState(false)
  const [dragOver,    setDragOver]     = useState(false)
  const [skills,      setSkills]       = useState([])
  const [techs,       setTechs]        = useState([])
  const [deletingId,  setDeletingId]   = useState(null)
  const [analyzingId, setAnalyzingId]  = useState(null)
  const [atsResults,  setAtsResults]   = useState({})
  const [openAts,    setOpenAts]      = useState({})
  const fileInputRef                   = useRef(null)

  // ── check auth on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
  }, [token, navigate])

  // ── load current resume data & list ──────────────────────────────────────
  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const [resData, listData] = await Promise.all([
          apiFetch('/api/resume'),
          apiFetch('/api/resume/list'),
        ])
        setData(resData)
        setResumes(listData.resumes || [])
        setSkills(resData.skills || [])
        setTechs(resData.technologies || [])
      } catch (err) { 
        console.error('Resume load error:', err)
        toast.error('Could not load resume data')
      }
      finally { setLoading(false) }
    }
    load()
  }, [token])

  // ── upload handler ───────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return
    const ok = ['application/pdf', 'text/plain'].includes(file.type) ||
               /\.(pdf|txt|doc|docx)$/i.test(file.name)
    if (!ok) { toast.error('Please upload a PDF, DOC, or TXT file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large — max 5 MB'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('resume', file)

    try {
      const token = localStorage.getItem('iq_token')
      const res   = await fetch(`${BASE}/api/resume/upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)

      // Reload both data and list
      const [resData, listData] = await Promise.all([
        apiFetch('/api/resume'),
        apiFetch('/api/resume/list'),
      ])
      setData(resData)
      setResumes(listData.resumes || [])
      setSkills(resData.skills || [])
      setTechs(resData.technologies || [])
      toast.success('Resume added — skills extracted!')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  // ── select a resume ──────────────────────────────────────────────────────
  const selectResume = async (resumeId) => {
    try {
      await apiFetch(`/api/resume/${resumeId}/select`, { method: 'PUT' })
      const [resData, listData] = await Promise.all([
        apiFetch('/api/resume'),
        apiFetch('/api/resume/list'),
      ])
      setData(resData)
      setResumes(listData.resumes || [])
      setSkills(resData.skills || [])
      setTechs(resData.technologies || [])
      toast.success('Resume selected')
    } catch (err) {
      toast.error('Could not select resume')
    }
  }

  // ── delete a resume ──────────────────────────────────────────────────────
  const deleteResume = async (resumeId) => {
    if (resumes.length === 1) {
      toast.error('Cannot delete your last resume. Upload a new one first.')
      return
    }
    if (!window.confirm('Delete this resume?')) return
    
    setDeletingId(resumeId)
    try {
      await apiFetch(`/api/resume/${resumeId}`, { method: 'DELETE' })
      const [resData, listData] = await Promise.all([
        apiFetch('/api/resume'),
        apiFetch('/api/resume/list'),
      ])
      setData(resData)
      setResumes(listData.resumes || [])
      setSkills(resData.skills || [])
      setTechs(resData.technologies || [])
      toast.success('Resume deleted')
    } catch (err) {
      toast.error(err.message || 'Could not delete resume')
    } finally {
      setDeletingId(null)
    }
  }

  // ── analyze ATS score ────────────────────────────────────────────────────
  const analyzeATS = async (resumeId, jobDescription = '') => {
    setAnalyzingId(resumeId)
    try {
      const params = jobDescription ? `?jobDescription=${encodeURIComponent(jobDescription)}` : ''
      const result = await apiFetch(`/api/resume/${resumeId}/ats-score${params}`)
      setAtsResults(prev => ({ ...prev, [resumeId]: result }))
      setOpenAts(prev => ({ ...prev, [resumeId]: true }))
      toast.success('ATS analysis complete')
    } catch (err) {
      toast.error('Could not analyze ATS score')
    } finally {
      setAnalyzingId(null)
    }
  }

  const closeATS = (resumeId) => {
    setOpenAts(prev => ({ ...prev, [resumeId]: false }))
  }

  // ── clear all resumes ────────────────────────────────────────────────────
  const clearAllResumes = async () => {
    if (!window.confirm('Remove all resumes and extracted data?')) return
    try {
      await apiFetch('/api/resume', { method: 'DELETE' })
      setData({ hasResume: false })
      setResumes([])
      setSkills([])
      setTechs([])
      toast.success('All resumes cleared')
    } catch { toast.error('Could not clear resumes') }
  }

  // ── save manual skill edits ───────────────────────────────────────────────
  const saveSkills = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/resume/skills', {
        method: 'POST',
        body:   JSON.stringify({ skills, technologies: techs }),
      })
      toast.success('Skills saved')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center pt-16">
      <div className="flex gap-2">
        <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-void pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-electric text-sm font-mono font-medium uppercase tracking-widest mb-2">Profile</p>
          <h1 className="font-display text-4xl font-bold text-text-primary mb-2">Resume & Skills</h1>
          <p className="text-text-secondary">
            Upload multiple resumes — select which one to use for each interview.
          </p>
        </motion.div>

        {/* ── Resume list (if any exist) ── */}
        {resumes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mb-6 glass rounded-2xl p-5 border border-border/40"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-text-primary">Your Resumes</h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-electric/15 text-electric border border-electric/30">
                {resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'}
              </span>
            </div>
            <div className="space-y-2">
              {resumes.map(resume => (
                <div
                  key={resume._id}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                    resume.isActive
                      ? 'border-electric bg-electric/8'
                      : 'border-border/40 hover:border-border-bright'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">{resume.fileName}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Uploaded'}
                      {resume.charCount && ` · ${(resume.charCount / 1000).toFixed(1)}k characters`}
                    </p>
                  </div>
                  {resume.isActive && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30 flex-shrink-0">
                      Active
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => analyzeATS(resume._id)}
                      disabled={analyzingId === resume._id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-text-secondary border border-border hover:border-electric/50 hover:text-electric transition-all"
                      title="Analyze ATS Score"
                    >
                      {analyzingId === resume._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Brain className="w-3.5 h-3.5" />
                      )}
                      ATS
                    </button>
                    {!resume.isActive && (
                      <button
                        onClick={() => selectResume(resume._id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-text-secondary border border-border hover:border-border-bright hover:text-text-primary transition-all"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => deleteResume(resume._id)}
                      disabled={deletingId === resume._id}
                      className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                      title="Delete resume"
                    >
                      {deletingId === resume._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
              {/* ATS Results */}
              {resumes.map(resume => atsResults[resume._id] && (
                <motion.div
                  key={`ats-${resume._id}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-3 rounded-lg bg-void/60 border border-border/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-electric" />
                    <span className="font-medium text-text-primary text-sm">ATS Score for {resume.fileName}</span>
                    <span className={`text-lg font-bold ${
                      atsResults[resume._id].atsScore >= 80 ? 'text-success' :
                      atsResults[resume._id].atsScore >= 60 ? 'text-warning' : 'text-danger'
                    }`}>
                      {atsResults[resume._id].atsScore}/100
                    </span>
                  </div>
                  {atsResults[resume._id].breakdown && (
                    <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                      <div>Keywords: {atsResults[resume._id].breakdown.keywordMatch || 0}/100</div>
                      <div>Format: {atsResults[resume._id].breakdown.format || 0}/100</div>
                      <div>Achievements: {atsResults[resume._id].breakdown.achievements || 0}/100</div>
                      <div>Completeness: {atsResults[resume._id].breakdown.completeness || 0}/100</div>
                    </div>
                  )}
                  {atsResults[resume._id].strengths?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-text-muted mb-1">Strengths:</p>
                      <div className="flex flex-wrap gap-1">
                        {atsResults[resume._id].strengths.map((strength, i) => (
                          <span key={i} className="text-xs bg-success/15 text-success px-2 py-0.5 rounded">
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {atsResults[resume._id].feedback?.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">Suggestions:</p>
                      <ul className="text-xs text-text-secondary space-y-0.5">
                        {atsResults[resume._id].feedback.map((item, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-electric mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            {/* ATS Results */}
            {resumes.map(resume => atsResults[resume._id] && (
              <motion.div
                key={`ats-${resume._id}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-3 rounded-lg bg-void/60 border border-border/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-electric" />
                  <span className="font-medium text-text-primary text-sm">ATS Score for {resume.fileName}</span>
                  <span className={`text-lg font-bold ${
                    atsResults[resume._id].atsScore >= 80 ? 'text-success' :
                    atsResults[resume._id].atsScore >= 60 ? 'text-warning' : 'text-danger'
                  }`}>
                    {atsResults[resume._id].atsScore}/100
                  </span>
                </div>
                {atsResults[resume._id].breakdown && (
                  <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                    <div>Keywords: {atsResults[resume._id].breakdown.keywordMatch || 0}/100</div>
                    <div>Format: {atsResults[resume._id].breakdown.format || 0}/100</div>
                    <div>Achievements: {atsResults[resume._id].breakdown.achievements || 0}/100</div>
                    <div>Completeness: {atsResults[resume._id].breakdown.completeness || 0}/100</div>
                  </div>
                )}
                {atsResults[resume._id].strengths?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-text-muted mb-1">Strengths:</p>
                    <div className="flex flex-wrap gap-1">
                      {atsResults[resume._id].strengths.map((strength, i) => (
                        <span key={i} className="text-xs bg-success/15 text-success px-2 py-0.5 rounded">
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {atsResults[resume._id].feedback?.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">Suggestions:</p>
                    <ul className="text-xs text-text-secondary space-y-0.5">
                      {atsResults[resume._id].feedback.map((item, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-electric mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Upload zone ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {resumes.length === 0 ? (
            /* ── No resumes yet ── */
            <div
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200 cursor-pointer ${
                dragOver
                  ? 'border-electric bg-electric/8 scale-[1.01]'
                  : 'border-border hover:border-electric/50 hover:bg-electric/4'
              }`}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-electric/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-electric animate-spin" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-text-primary text-lg mb-1">Analyzing resume…</p>
                    <p className="text-text-secondary text-sm">AI is extracting your skills and experience</p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-electric-gradient rounded-full"
                      animate={{ width: ['0%', '90%'] }}
                      transition={{ duration: 8, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={dragOver ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                    className="w-16 h-16 rounded-2xl bg-electric/10 border border-electric/30 flex items-center justify-center"
                  >
                    <Upload className="w-8 h-8 text-electric" />
                  </motion.div>
                  <div>
                    <p className="font-display font-semibold text-text-primary text-xl mb-2">
                      {dragOver ? 'Drop it!' : 'Drop your resume here'}
                    </p>
                    <p className="text-text-secondary text-sm">or click to browse · PDF, DOC, TXT · max 5 MB</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {['Extracts skills automatically', 'Tailors interview questions', 'Identifies your tech stack'].map(f => (
                      <span key={f} className="flex items-center gap-1.5 text-xs text-text-secondary bg-border/50 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-success" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Resumes exist — show upload button ── */
            <div className="glass-bright rounded-2xl p-6 border border-electric/20 text-center">
              <p className="text-text-secondary mb-4">Add another resume to your collection</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary mb-4"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                ) : (
                  <><Plus className="w-4 h-4" /> Upload Resume</>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
              <p className="text-text-muted text-xs">or drag & drop to add another resume</p>
            </div>
          )}
        </motion.div>

        {/* ── Extracted data ── */}
        {(resumes.length > 0 || skills.length > 0 || techs.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="space-y-4 mt-6"
          >
            {/* Save banner */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <Sparkles className="w-4 h-4 text-electric" />
                AI-extracted profile — edit any section below
              </div>
              <button
                onClick={saveSkills}
                disabled={saving}
                className="btn-primary text-sm py-2 px-5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save changes</>}
              </button>
            </div>

            {/* Skills */}
            <Section icon={Brain} title="Skills" color="#4f8ef7" count={skills.length}>
              <TagEditor
                items={skills}
                color="#4f8ef7"
                placeholder="e.g. Problem Solving"
                onChange={setSkills}
              />
            </Section>

            {/* Technologies */}
            <Section icon={Code2} title="Technologies & Tools" color="#22d3ee" count={techs.length}>
              <TagEditor
                items={techs}
                color="#22d3ee"
                placeholder="e.g. React, Node.js, PostgreSQL"
                onChange={setTechs}
              />
            </Section>

            {/* Experience */}
            {data?.experience?.length > 0 && (
              <Section icon={Briefcase} title="Work Experience" color="#a78bfa" count={data.experience.length} defaultOpen={true}>
                <div className="space-y-4">
                  {data.experience.map((exp, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-void/40 border border-border/40">
                      <div className="w-8 h-8 rounded-lg bg-neon/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Briefcase className="w-4 h-4 text-neon" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-medium text-text-primary text-sm">{exp.role || 'Role'}</p>
                            <p className="text-electric text-xs mt-0.5">{exp.company || 'Company'}</p>
                          </div>
                          {exp.duration && (
                            <span className="text-xs text-text-muted bg-border/60 px-2 py-0.5 rounded-full flex-shrink-0">
                              {exp.duration}
                            </span>
                          )}
                        </div>
                        {exp.description && (
                          <p className="text-text-muted text-xs mt-2 leading-relaxed">{exp.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Projects */}
            {data?.projects?.length > 0 && (
              <Section icon={FolderGit2} title="Projects" color="#10b981" count={data.projects.length}>
                <div className="space-y-4">
                  {data.projects.map((proj, i) => (
                    <div key={i} className="p-4 rounded-xl bg-void/40 border border-border/40">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-text-primary text-sm">{proj.name || `Project ${i + 1}`}</p>
                        <FolderGit2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      </div>
                      {proj.description && (
                        <p className="text-text-muted text-xs leading-relaxed mb-3">{proj.description}</p>
                      )}
                      {proj.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {proj.technologies.map((t, j) => (
                            <Tag key={j} label={t} color="#10b981" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Education */}
            {data?.education?.length > 0 && (
              <Section icon={GraduationCap} title="Education" color="#f59e0b" count={data.education.length} defaultOpen={false}>
                <div className="space-y-3">
                  {data.education.map((edu, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-void/40 border border-border/40">
                      <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <GraduationCap className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          {[edu.degree, edu.field].filter(Boolean).join(' in ')}
                        </p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {edu.institution}{edu.year ? ` · ${edu.year}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </motion.div>
        )}

        {/* ── Empty state if no resume and no data ── */}
        {resumes.length === 0 && !skills.length && !loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-8 glass rounded-2xl p-8 text-center border border-border/40"
          >
            <AlertTriangle className="w-10 h-10 text-warning/60 mx-auto mb-3" />
            <p className="font-display font-semibold text-text-primary mb-1">No resume on file</p>
            <p className="text-text-secondary text-sm">
              Without a resume, the AI uses generic questions. Upload one to get a fully personalized interview.
            </p>
          </motion.div>
        )}

      </div>
    </div>
  )
}