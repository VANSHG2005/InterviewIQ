import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Eye, EyeOff, ArrowRight, Upload, CheckCircle2, Loader2, X } from 'lucide-react'
import { useAuthStore } from '../context/auth.js'
import toast from 'react-hot-toast'

const BASE = import.meta.env.VITE_API_URL || ''

export default function Signup() {
  const [form,       setForm]       = useState({ name: '', email: '', password: '' })
  const [showPass,   setShowPass]   = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [step,       setStep]       = useState(1)
  const { signup, loading }         = useAuthStore()
  const navigate                    = useNavigate()

  const handleAccount = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    try {
      await signup(form.name, form.email, form.password)
      setStep(2)
    } catch (err) {
      toast.error(err.message || 'Signup failed')
    }
  }

  const handleResume = async (e) => {
    e.preventDefault()
    if (!resumeFile) { navigate('/dashboard'); return }
    const formData = new FormData()
    formData.append('resume', resumeFile)
    try {
      const token = localStorage.getItem('iq_token')
      const res   = await fetch(`${BASE}/api/resume/upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      toast.success('Resume analyzed — skills extracted!')
    } catch {
      toast.error('Resume upload failed. You can add it later.')
    }
    navigate('/dashboard')
  }

  const pickFile = (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0] || e.target.files?.[0]
    if (!file) return
    const ok = ['application/pdf', 'text/plain'].includes(file.type) ||
               /\.(pdf|txt|doc|docx)$/i.test(file.name)
    if (!ok) { toast.error('Please upload a PDF or text file'); return }
    setResumeFile(file)
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.08), transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass rounded-3xl p-8 shadow-card border border-border-bright/40">

          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-electric-gradient flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-text-primary">InterviewIQ</span>
            </Link>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2].map((s) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s ? 'bg-electric text-white' :
                    step > s  ? 'bg-success text-white' :
                                'bg-border text-text-muted'
                  }`}>
                    {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                  </div>
                  {s < 2 && <div className={`w-12 h-0.5 transition-all ${step > s ? 'bg-success' : 'bg-border'}`} />}
                </React.Fragment>
              ))}
            </div>

            <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
              {step === 1 ? 'Create account' : 'Upload resume'}
            </h1>
            <p className="text-text-secondary text-sm">
              {step === 1
                ? 'Start your AI-powered interview journey'
                : 'Let the AI tailor questions to your profile'}
            </p>
          </div>

          {/* Step 1 — Account */}
          {step === 1 && (
            <form onSubmit={handleAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">Full name</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex Chen"
                  required
                  className="w-full bg-void/60 border border-border hover:border-border-bright focus:border-electric rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  required
                  className="w-full bg-void/60 border border-border hover:border-border-bright focus:border-electric rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    required
                    className="w-full bg-void/60 border border-border hover:border-border-bright focus:border-electric rounded-xl px-4 py-3 pr-11 text-text-primary placeholder:text-text-muted transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 mt-2">
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>
          )}

          {/* Step 2 — Resume */}
          {step === 2 && (
            <form onSubmit={handleResume} className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  resumeFile
                    ? 'border-success/60 bg-success/5'
                    : 'border-border hover:border-electric/60 hover:bg-electric/5'
                }`}
                onDrop={pickFile}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById('resume-file').click()}
              >
                <input id="resume-file" type="file" accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={pickFile} />
                {resumeFile ? (
                  <div>
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                    <p className="text-success font-medium text-sm">{resumeFile.name}</p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setResumeFile(null) }}
                      className="text-text-muted hover:text-danger text-xs mt-2 flex items-center gap-1 mx-auto transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-text-muted mx-auto mb-3" />
                    <p className="text-text-secondary text-sm font-medium">Drop your resume here</p>
                    <p className="text-text-muted text-xs mt-1">PDF, DOC, or TXT · max 5 MB</p>
                  </div>
                )}
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3.5">
                {resumeFile ? 'Analyze & continue' : 'Skip for now'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 1 && (
            <p className="text-center text-sm text-text-secondary mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-electric hover:text-electric-glow transition-colors font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
