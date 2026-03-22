import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain, Zap, Target, TrendingUp, MessageSquare,
  ChevronRight, ArrowRight, Sparkles, Code2, BarChart3, Shield,
} from 'lucide-react'

const FEATURES = [
  { icon: Brain,        title: 'AI Interview Engine',    color: '#4f8ef7', glow: 'rgba(79,142,247,0.2)',   desc: 'A senior-engineer-grade AI that adapts to your resume, probes weak answers, and shifts difficulty in real time.' },
  { icon: Target,       title: 'Skill Gap Analysis',     color: '#22d3ee', glow: 'rgba(34,211,238,0.2)',   desc: 'Every answer scored against ideal responses. Gaps mapped to specific topics, not vague subject areas.' },
  { icon: TrendingUp,   title: 'Learning Roadmap',       color: '#a78bfa', glow: 'rgba(167,139,250,0.2)',  desc: 'Week-by-week study plans built from your actual weak spots, not generic interview prep.' },
  { icon: MessageSquare,title: 'Realistic Conversation', color: '#4f8ef7', glow: 'rgba(79,142,247,0.2)',   desc: 'Chat-style UI with typing indicators, follow-up probes, and tone calibration for every interview mode.' },
  { icon: BarChart3,    title: 'Performance Tracking',   color: '#22d3ee', glow: 'rgba(34,211,238,0.2)',   desc: 'Score trends over time, heatmaps of weak topics, and session-by-session comparison.' },
  { icon: Shield,       title: 'Company-Style Modes',    color: '#a78bfa', glow: 'rgba(167,139,250,0.2)',  desc: 'Google, Amazon, Meta — interviews structured around each company\'s known rubrics and style.' },
]

const STEPS = [
  { n: '01', title: 'Upload your resume',  desc: 'The AI reads your skills, projects, and stack — then builds a question set specific to your profile.' },
  { n: '02', title: 'Pick your mode',      desc: 'Technical, behavioral, HR, or company-style. The AI sets its persona accordingly.' },
  { n: '03', title: 'Interview starts',    desc: 'Conversational, real-time. Follow-ups probe anything vague. Difficulty shifts if you\'re comfortable.' },
  { n: '04', title: 'Answers evaluated',   desc: 'Each response scored on correctness, depth, and communication. Ideal answers shown in the report.' },
  { n: '05', title: 'Gaps mapped',         desc: 'Weak topics listed with specific concepts to study — not just broad subject areas.' },
  { n: '06', title: 'Roadmap generated',   desc: 'Week-by-week study plan, recommended projects, and resources built from your performance.' },
]

const STATS = [
  { value: '50K+',  label: 'Interviews conducted' },
  { value: '94%',   label: 'User satisfaction' },
  { value: '3.2×',  label: 'Avg score improvement' },
  { value: '200+',  label: 'Companies covered' },
]

const MODES = [
  { label: 'Technical',     color: '#4f8ef7', icon: Code2 },
  { label: 'Behavioral',    color: '#a78bfa', icon: MessageSquare },
  { label: 'HR Round',      color: '#22d3ee', icon: Zap },
  { label: 'System Design', color: '#10b981', icon: Target },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09 } },
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-void overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-electric-gradient flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-text-primary">InterviewIQ</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a href="#features"      className="hover:text-text-primary transition-colors">Features</a>
            <a href="#how-it-works"  className="hover:text-text-primary transition-colors">How it works</a>
            <a href="#stats"         className="hover:text-text-primary transition-colors">Results</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login"  className="btn-ghost text-sm py-2 px-4">Sign in</Link>
            <Link to="/signup" className="btn-primary text-sm py-2 px-4">
              Get started <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute inset-0 bg-radial-glow opacity-40" />

        {/* Orbs */}
        <motion.div
          className="absolute top-40 left-20 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(79,142,247,0.12), transparent)' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-40 right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1), transparent)' }}
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-electric/30 text-sm text-electric mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Groq AI — sub-second inference
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-6xl md:text-8xl font-bold leading-[0.95] tracking-tight mb-8"
          >
            <span className="text-text-primary">Practice like</span>
            <br />
            <span className="text-gradient">the real thing.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed mb-12"
          >
            An AI interviewer that reads your resume, asks sharp follow-ups, evaluates every
            answer with precision, and tells you exactly what to fix — not generic advice.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Link to="/signup" className="btn-primary text-base py-4 px-8 glow-electric">
              Start your first interview <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="btn-ghost text-base py-4 px-8">
              See how it works
            </a>
          </motion.div>

          {/* Mode pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            {MODES.map(({ label, color, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm border"
                style={{ borderColor: color + '40', color }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Preview bar at bottom of hero */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6"
        >
          <div className="glass-bright rounded-t-2xl p-4 border-t border-x border-border-bright/60">
            <div className="flex gap-1.5 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-danger/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/50" />
            </div>
            <div className="grid grid-cols-2 gap-3 h-20 overflow-hidden">
              <div className="glass rounded-xl p-3 flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-electric-gradient flex-shrink-0 flex items-center justify-center">
                  <Brain className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-electric/30 rounded w-3/4 mb-1.5" />
                  <div className="h-2 bg-electric/20 rounded w-1/2 mb-1.5" />
                  <div className="h-2 bg-electric/15 rounded w-2/3" />
                </div>
              </div>
              <div className="glass rounded-xl p-3 flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-panel border border-border flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-2 bg-text-muted/30 rounded w-2/3 mb-1.5" />
                  <div className="h-2 bg-text-muted/20 rounded w-1/2 mb-3" />
                  <div className="flex gap-1">
                    <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section id="stats" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {STATS.map(({ value, label }) => (
              <motion.div key={label} variants={fadeUp} className="glass rounded-2xl p-6 text-center">
                <div className="font-display text-4xl font-bold text-gradient mb-2">{value}</div>
                <div className="text-sm text-text-secondary">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-electric text-sm font-mono font-medium uppercase tracking-widest mb-4">Platform</p>
            <h2 className="font-display text-5xl font-bold text-text-primary mb-4">
              Everything you need<br /><span className="text-gradient">to get the job.</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Not another question bank. A live system that evaluates, critiques, and teaches.
            </p>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES.map(({ icon: Icon, title, desc, color, glow }) => (
              <motion.div
                key={title} variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass rounded-2xl p-6 group relative overflow-hidden cursor-default"
              >
                <div
                  className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: glow, transform: 'translate(40%, -40%)' }}
                />
                <div
                  className="mb-4 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: glow, border: `1px solid ${color}40` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-display font-semibold text-lg text-text-primary mb-2">{title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-cyan text-sm font-mono font-medium uppercase tracking-widest mb-4">Process</p>
            <h2 className="font-display text-5xl font-bold text-text-primary mb-4">
              Interview to report<br /><span className="text-gradient-neon">in six steps.</span>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {STEPS.map(({ n, title, desc }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="glass rounded-2xl p-5 flex gap-5 items-start"
              >
                <div className="font-mono text-2xl font-bold text-gradient opacity-50 flex-shrink-0 w-10 pt-0.5">{n}</div>
                <div>
                  <h3 className="font-display font-semibold text-text-primary mb-1">{title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="glass-bright rounded-3xl p-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-radial-glow opacity-20 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="font-display text-5xl font-bold text-text-primary mb-4">
                Ready to interview<br /><span className="text-gradient">smarter?</span>
              </h2>
              <p className="text-text-secondary mb-8 text-lg">
                Free to start. No credit card. Your first interview in under two minutes.
              </p>
              <Link to="/signup" className="btn-primary text-base py-4 px-10 glow-electric">
                Create free account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-electric-gradient flex items-center justify-center">
              <Brain className="w-3 h-3 text-white" />
            </div>
            <span className="font-display font-bold text-text-primary">InterviewIQ</span>
          </div>
          <p className="text-text-muted text-sm">© 2024 InterviewIQ. Powered by Groq AI.</p>
        </div>
      </footer>
    </div>
  )
}
