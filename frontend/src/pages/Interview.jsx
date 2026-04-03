import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Send, Clock, Mic, MicOff, Loader2, CheckCircle2,
  Video, User, BarChart3, MessageSquare, PhoneOff,
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
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [quickScores, setQuickScores] = useState({ clarity: null, depth: null, confidence: null, relevance: null })

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

  // ── Scroll transcript ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  // ── TTS Logic ───────────────────────────────────────────────────────────────
  const getVoice = () => {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices()
      if (voices.length !== 0) {
        resolve(voices)
        return
      }
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices()
        resolve(voices)
      }
    })
  }

  const speak = async (text) => {
    if (!window.speechSynthesis) return
    
    // Stop any current speaking
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    await delay(100) // Small gap

    const voices = await getVoice()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95
    utt.pitch = 1.0
    
    const pref = voices.find(v => (v.name.includes('Google') || v.name.includes('Natural')) && v.lang.startsWith('en-US')) ||
                 voices.find(v => v.lang.startsWith('en-US')) || 
                 voices.find(v => v.lang.startsWith('en')) ||
                 voices[0]
    if (pref) utt.voice = pref

    return new Promise((resolve) => {
      utt.onstart = () => setIsSpeaking(true)
      utt.onend = () => { setIsSpeaking(false); resolve() }
      utt.onerror = () => { setIsSpeaking(false); resolve() }
      window.speechSynthesis.speak(utt)
    })
  }

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
    const text = `Hello! I'm Alex Chen, your AI interviewer today. We'll conduct a ${typeLabel(iv)} interview. ` +
                 `I'll ask ${MAX_Q} questions, with follow-ups where needed. When you're ready, press "Begin".`
    await delay(1100)
    setAiTyping(false)
    addMsg('ai', text)
    setPhase('intro')
    speak(text)
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
        speak(data.question)
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

      if (data.quickScores) {
        setQuickScores(data.quickScores)
      }

      if (data.feedback && !data.done) {
        setAiTyping(true)
        await delay(700)
        setAiTyping(false)
        addMsg('ai', data.feedback)
        await speak(data.feedback)
        await delay(300)
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
    const text = "That wraps up our session. You stayed focused throughout — that matters. " +
                 "I'm compiling your full evaluation now."
    await delay(1400)
    setAiTyping(false)
    addMsg('ai', text)
    await speak(text)
    
    try {
      setSubmitting(true)
      await apiFetch(`/api/interviews/${id}/complete`, { method: 'POST' })
      sessionStorage.setItem(`completed_${id}`, 'true')
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
    if (isSpeaking) return
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
          if (data.text) {
             // In "Press to talk" style, we might want to automatically submit
             // but here we'll just set the text and let user confirm or press enter
             setAnswer(prev => (prev ? prev + ' ' : '') + data.text)
          }
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
            {interview?.type} interview · {interview?.company || 'Standard'}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(qCount / MAX_Q) * 100}%`, background: 'linear-gradient(90deg, #4f8ef7, #22d3ee)' }}
              />
            </div>
            <span className="font-mono text-xs text-text-secondary">{qCount}/{MAX_Q}</span>
          </div>
          {timerOn && (
            <div className="flex items-center gap-1.5 font-mono text-sm text-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span className={timer > 120 ? 'text-warning' : ''}>{fmt(timer)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Video Grid Layout */}
      <div className="flex-1 overflow-hidden p-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        
        {/* Left: AI Avatar Panel */}
        <div className="relative glass rounded-3xl overflow-hidden flex flex-col items-center justify-center border border-border/50">
           {/* Q Counter */}
           <div className="absolute top-6 right-6 px-4 py-1.5 rounded-full glass-bright border border-electric/30 text-xs font-bold text-electric">
              QUESTION {qCount} / {MAX_Q}
           </div>

           {/* Avatar */}
           <div className="relative">
              <div className={`w-48 h-48 rounded-full bg-panel border-4 border-border transition-all duration-300 flex items-center justify-center overflow-hidden relative ${isSpeaking ? 'speaking-ring' : ''}`}>
                 <div className="w-full h-full bg-electric-gradient flex items-center justify-center">
                    <Brain className="w-24 h-24 text-white opacity-90" />
                 </div>
                 
                 {/* Mouth bars */}
                 {isSpeaking && (
                   <div className="absolute bottom-12 flex gap-1 items-end h-8">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className="mouth-bar" style={{ animationDelay: `${i * 0.12}s` }} />
                     ))}
                   </div>
                 )}
              </div>
           </div>

           <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold text-text-primary">Alex Chen</h2>
              <p className="text-sm text-text-secondary uppercase tracking-widest mt-1">Senior Technical Interviewer</p>
           </div>

           {/* Waveform Visualization */}
           <div className="mt-8 h-12 flex items-center gap-1">
              {isSpeaking && [1,2,3,4,5,6,7,8,9,10].map(i => (
                <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
           </div>

           {/* Speaking Label */}
           <AnimatePresence>
             {isSpeaking && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 10 }}
                 className="absolute bottom-10 px-4 py-2 rounded-full bg-electric/10 border border-electric/30 text-electric text-xs flex items-center gap-2"
               >
                 <div className="w-2 h-2 rounded-full bg-electric animate-pulse" />
                 Interviewer is speaking...
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4 overflow-hidden">
          
          {/* User Video Panel */}
          <div className="glass rounded-2xl p-5 flex flex-col items-center border border-border/50">
            <div className="w-full h-40 bg-void rounded-xl border border-border flex items-center justify-center relative overflow-hidden group">
               <User className="w-16 h-16 text-text-muted" />
               <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/40 text-[10px] font-bold">
                 <Video className="w-3 h-3 text-text-muted" />
                 LIVE
               </div>
               
               {recording && (
                 <div className="absolute inset-0 bg-danger/5 flex items-center justify-center">
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-danger/20 text-danger text-[10px] font-bold animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                      REC
                    </div>
                 </div>
               )}

               {/* User waveform */}
               {recording && (
                 <div className="absolute bottom-4 flex gap-1 items-end h-6">
                   {[1,2,3,4,5,6].map(i => (
                     <div key={i} className="wave-bar-sm" style={{ animationDelay: `${i * 0.1}s` }} />
                   ))}
                 </div>
               )}
            </div>
            <div className="mt-3 flex items-center justify-between w-full px-1">
              <span className="text-xs font-semibold text-text-secondary">{user?.name || 'You'} (Candidate)</span>
              <div className="flex gap-1.5">
                 <div className={`w-1.5 h-1.5 rounded-full ${recording ? 'bg-danger' : 'bg-success'}`} />
                 <div className="w-1.5 h-1.5 rounded-full bg-border" />
              </div>
            </div>
          </div>

          {/* Live Score Panel */}
          <div className="glass rounded-2xl border border-border/50 overflow-hidden">
             <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-electric" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Live Metrics</span>
             </div>
             <div className="grid grid-cols-2 gap-px bg-border/30">
                {[
                  { label: 'Clarity', val: quickScores.clarity, color: 'text-electric' },
                  { label: 'Depth', val: quickScores.depth, color: 'text-cyan-400' },
                  { label: 'Confidence', val: quickScores.confidence, color: 'text-success' },
                  { label: 'Relevance', val: quickScores.relevance, color: 'text-warning' }
                ].map(s => (
                  <div key={s.label} className="bg-panel p-4 flex flex-col items-center justify-center">
                     <span className={`text-xl font-bold ${s.color}`}>{s.val ?? '—'}</span>
                     <span className="text-[10px] text-text-muted uppercase font-medium mt-0.5">{s.label}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Transcript Panel */}
          <div className="glass rounded-2xl border border-border/50 flex-1 flex flex-col overflow-hidden">
             <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-electric" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Conversation</span>
             </div>
             <div ref={chatRef} className="flex-1 transcript-scroll p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50 space-y-2">
                     <MessageSquare className="w-8 h-8" />
                     <p className="text-xs">Transcript will appear here...</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                     <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1 px-1">
                       {msg.role === 'ai' ? 'Alex Chen' : user?.name || 'You'}
                     </span>
                     <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                       msg.role === 'ai' 
                       ? 'bg-electric/10 border border-electric/20 text-text-primary' 
                       : 'bg-panel border border-border text-text-primary'
                     }`}>
                        {msg.content}
                     </div>
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-1 px-1">Alex Chen</span>
                    <div className="flex gap-1.5 p-2 items-center bg-electric/10 rounded-xl border border-electric/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
             </div>
          </div>

        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-border/50 glass">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          
          {/* Status Message */}
          <div className="text-[11px] text-text-muted font-medium flex items-center gap-2">
             {phase === 'intro' ? 'Interview is ready to begin' : 
              phase === 'qa' ? (recording ? 'Recording... click to stop' : 'Press microphone to answer or type below') :
              'Interview complete. Compiling results...'}
          </div>

          <div className="w-full flex items-end gap-4">
            {/* Answer Input Area */}
            {phase === 'qa' && (
              <div className="flex-1 glass-bright rounded-2xl p-2 border border-electric/20 flex flex-col">
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type your answer here..."
                  disabled={loading || aiTyping}
                  rows={2}
                  className="w-full bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none px-3 py-2 resize-none"
                />
                <div className="flex justify-end p-1">
                   <button
                    onClick={submitAnswer}
                    disabled={!answer.trim() || loading || aiTyping}
                    className="p-2 rounded-xl bg-electric hover:bg-electric-hover disabled:opacity-30 text-white transition-all shadow-lg"
                   >
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                   </button>
                </div>
              </div>
            )}

            {phase === 'intro' && !aiTyping && (
              <div className="flex-1 flex justify-center pb-4">
                <button
                  onClick={beginInterview}
                  className="btn-primary py-4 px-12 glow-electric text-lg font-bold group"
                >
                  <Brain className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  BEGIN INTERVIEW SESSION
                </button>
              </div>
            )}

            {/* Central Control: Microphone */}
            {phase === 'qa' && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleRecording}
                  disabled={isSpeaking || loading}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                    recording 
                    ? 'bg-danger text-white scale-110 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                    : 'bg-void border-2 border-electric text-electric hover:bg-electric/10'
                  } disabled:opacity-30`}
                >
                   {recording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                   {recording && (
                     <div className="absolute inset-0 rounded-full border-4 border-danger animate-ping opacity-30" />
                   )}
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {recording ? 'Stop' : 'Press to talk'}
                </span>
              </div>
            )}

            {/* End Button */}
            {phase === 'qa' && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-12 h-12 rounded-full flex items-center justify-center border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
                >
                   <PhoneOff className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Exit</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
