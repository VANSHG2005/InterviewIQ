import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Send, Clock, Mic, MicOff, Loader2, CheckCircle2,
} from 'lucide-react'
import { apiFetch, useAuthStore } from '../context/auth.js'
import toast from 'react-hot-toast'

const BASE  = import.meta.env.VITE_API_URL || ''
const MAX_Q = 8
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export default function Interview() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { token, user } = useAuthStore()

  const [interview,  setInterview]  = useState(null)
  const [messages,   setMessages]   = useState([])
  const [answer,     setAnswer]     = useState('')
  const [phase,      setPhase]      = useState('loading') // loading | intro | qa | ending
  const [aiTyping,   setAiTyping]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [qCount,     setQCount]     = useState(0)
  const [timer,      setTimer]      = useState(0)
  const [timerOn,    setTimerOn]    = useState(false)
  const [recording,  setRecording]  = useState(false)

  const chatRef   = useRef(null)
  const timerRef  = useRef(null)
  const mediaRef  = useRef(null)
  const chunksRef = useRef([])

  const userInitial = user?.name?.[0]?.toUpperCase() || 'U'

  // ── Load interview ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const data = await apiFetch(`/api/interviews/${id}`)
        const iv   = data.interview
        setInterview(iv)

        if (iv.completed) { navigate(`/results/${id}`); return }

        if (iv.questions?.length > 0) {
          // Resuming
          const msgs = []
          iv.questions.forEach((q, i) => {
            msgs.push({ id: `q${i}`, role: 'ai',   content: q.text })
            if (iv.answers?.[i]) msgs.push({ id: `a${i}`, role: 'user', content: iv.answers[i].text })
          })
          setMessages(msgs)
          setQCount(iv.questions.length)
          setPhase('qa')
          setTimerOn(true)
        } else {
          await intro(iv)
        }
      } catch {
        toast.error('Could not load interview')
        navigate('/dashboard')
      }
    }
    load()
  }, [id])

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerOn) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [timerOn])

  // ── Scroll chat ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, aiTyping])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addMsg = (role, content) => {
    const msg = { id: Date.now().toString(), role, content }
    setMessages(prev => [...prev, msg])
    return msg
  }

  const typeLabel = (iv) => {
    if (!iv) return 'interview'
    const map = { technical: 'technical', behavioral: 'behavioral', hr: 'HR', company: iv.company || 'company-style' }
    return map[iv.type] || 'interview'
  }

  // ── Introduction message ────────────────────────────────────────────────────
  const intro = async (iv) => {
    setAiTyping(true)
    await delay(1100)
    setAiTyping(false)
    addMsg('ai',
      `Hello! I'm your AI interviewer today. We'll do a ${typeLabel(iv)} interview — ` +
      `${MAX_Q} questions, with follow-ups where needed. Take your time; I'm evaluating ` +
      `technical accuracy, depth, and communication. When you're ready, press "Begin".`
    )
    setPhase('intro')
  }

  // ── Fetch next question from backend ────────────────────────────────────────
  const fetchQuestion = async () => {
    setAiTyping(true)
    try {
      const res  = await fetch(`${BASE}/api/interviews/${id}/question`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({}),
      })
      const data = await res.json()
      setAiTyping(false)

      if (data.done) {
        await finish()
      } else if (data.question) {
        addMsg('ai', data.question)
        setQCount(c => c + 1)
        setTimer(0)
        setTimerOn(true)
      }
    } catch {
      setAiTyping(false)
      toast.error('Connection error — please try again')
    }
  }

  // ── Submit an answer ────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    const txt = answer.trim()
    if (!txt || loading || aiTyping) return
    setAnswer('')
    setTimerOn(false)
    addMsg('user', txt)
    setLoading(true)

    try {
      const res  = await fetch(`${BASE}/api/interviews/${id}/answer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ answer: txt, questionIndex: qCount - 1 }),
      })
      const data = await res.json()

      if (data.feedback && !data.done) {
        setAiTyping(true)
        await delay(700)
        setAiTyping(false)
        addMsg('ai', data.feedback)
        await delay(500)
      }

      if (data.done || qCount >= MAX_Q) {
        await finish()
      } else {
        await fetchQuestion()
      }
    } catch {
      toast.error('Failed to save answer')
    } finally {
      setLoading(false)
    }
  }

  // ── Finish and generate report ───────────────────────────────────────────────
  const finish = async () => {
    setPhase('ending')
    setAiTyping(true)
    await delay(1400)
    setAiTyping(false)
    addMsg('ai',
      "That wraps up our session. You stayed focused throughout — that matters. " +
      "I'm compiling your full evaluation now: scores, skill gaps, and a personalised study roadmap."
    )
    await delay(2000)
    try {
      setSubmitting(true)
      await apiFetch(`/api/interviews/${id}/complete`, { method: 'POST' })
      toast.success('Report ready!')
      await delay(800)
      navigate(`/results/${id}`)
    } catch {
      toast.error('Error generating report')
      navigate('/dashboard')
    }
  }

  const beginInterview = async () => {
    setPhase('qa')
    await fetchQuestion()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer() }
  }

  // ── Voice recording ─────────────────────────────────────────────────────────
  const toggleRecording = async () => {
    if (recording) {
      mediaRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr     = new MediaRecorder(stream)
      mediaRef.current  = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        const blob     = new Blob(chunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', blob, 'answer.webm')
        try {
          const res  = await fetch(`${BASE}/api/speech/transcribe`, {
            method:  'POST',
            headers: { Authorization: `Bearer ${token}` },
            body:    formData,
          })
          const data = await res.json()
          if (data.text) setAnswer(prev => (prev ? prev + ' ' : '') + data.text)
        } catch { toast.error('Transcription failed') }
        stream.getTracks().forEach(t => t.stop())
      }

      mr.start()
      setRecording(true)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const fmt = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // ── Render ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-electric animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void flex flex-col pt-16">

      {/* Header bar */}
      <div className="glass border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-text-secondary text-sm capitalize">
            {interview?.type} interview
            {interview?.company && ` · ${interview.company}`}
          </span>
        </div>
        <div className="flex items-center gap-5">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(qCount / MAX_Q) * 100}%`, background: 'linear-gradient(90deg, #4f8ef7, #22d3ee)' }}
              />
            </div>
            <span className="font-mono text-xs text-text-secondary">{qCount}/{MAX_Q}</span>
          </div>
          {/* Timer */}
          {timerOn && (
            <div className="flex items-center gap-1.5 font-mono text-sm text-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span className={timer > 120 ? 'text-warning' : ''}>{fmt(timer)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4">
        <div
          ref={chatRef}
          className="flex-1 chat-scroll py-6 space-y-5"
          style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}
        >
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* AI Avatar */}
                {msg.role === 'ai' && (
                  <div className="flex-shrink-0 relative w-10 h-10">
                    <div className="w-10 h-10 rounded-2xl bg-electric-gradient flex items-center justify-center glow-electric avatar-pulse">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-panel border border-border flex items-center justify-center">
                    <span className="text-text-primary text-sm font-bold">{userInitial}</span>
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                  msg.role === 'ai'
                    ? 'glass-bright border border-electric/20 text-text-primary rounded-tl-sm'
                    : 'text-text-primary rounded-tr-sm border border-electric/30'
                }`}
                style={msg.role === 'user' ? { background: 'rgba(79,142,247,0.12)' } : {}}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {aiTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-electric-gradient flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="glass-bright rounded-2xl rounded-tl-sm px-5 py-4 border border-electric/20">
                <div className="flex gap-1.5 items-center">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="py-4 border-t border-border/50">

          {phase === 'intro' && !aiTyping && (
            <div className="flex justify-center">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={beginInterview}
                className="btn-primary py-3.5 px-8 glow-electric text-base"
              >
                <Brain className="w-4 h-4" />
                Begin interview
              </motion.button>
            </div>
          )}

          {phase === 'qa' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-3 border border-border-bright/50"
            >
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                disabled={loading || aiTyping}
                rows={3}
                style={{ resize: 'none' }}
                className="w-full bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none leading-relaxed px-2 py-1"
              />
              <div className="flex items-center justify-between pt-2 px-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleRecording}
                    className={`p-2 rounded-lg transition-all ${
                      recording
                        ? 'bg-danger/20 text-danger'
                        : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
                    }`}
                    title={recording ? 'Stop recording' : 'Voice answer'}
                  >
                    {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  {recording && (
                    <span className="text-xs text-danger animate-pulse">Recording…</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted text-xs">{answer.length} chars</span>
                  <button
                    onClick={submitAnswer}
                    disabled={!answer.trim() || loading || aiTyping}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><span>Send</span><Send className="w-3.5 h-3.5" /></>
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'ending' && (
            <div className="flex items-center justify-center gap-2 text-text-secondary py-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin text-electric" /><span className="text-sm">Generating your report…</span></>
                : <><CheckCircle2 className="w-4 h-4 text-success" /><span className="text-sm">Interview complete</span></>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
