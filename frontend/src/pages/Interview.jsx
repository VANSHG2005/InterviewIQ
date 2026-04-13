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
  const [phase,      setPhase]      = useState('loading') // loading | intro | qa | ending
  const [aiTyping,   setAiTyping]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [qCount,     setQCount]     = useState(0)
  const [timer,      setTimer]      = useState(0)
  const [timerOn,    setTimerOn]    = useState(false)
  const [recording,  setRecording]  = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [subtitleText, setSubtitleText] = useState('')
  const [quickScores, setQuickScores] = useState({ clarity: null, depth: null, confidence: null, relevance: null })
  const [transcribingText, setTranscribingText] = useState('')

  const chatRef   = useRef(null)
  const timerRef  = useRef(null)
  const mediaRef  = useRef(null)
  const chunksRef = useRef([])
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const audioRef  = useRef(null)

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

  // ── User Camera Management ──────────────────────────────────────────────────
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (err) {
        console.warn("Camera access denied:", err)
      }
    }
    if (phase !== 'loading') startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [phase])

  const handleEndSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    navigate('/dashboard')
  }

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerOn) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [timerOn])

  // ── Scroll transcript ───────────────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, transcribingText, aiTyping])

  // ── TTS Logic (ElevenLabs with Browser Fallback) ───────────────────────────
  const getVoice = () => {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices()
      if (voices.length !== 0) { resolve(voices); return }
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices()
        resolve(voices)
      }
    })
  }

  const browserSpeakFallback = async (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const voices = await getVoice()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95
    utt.pitch = 1.0
    const pref = voices.find(v => (v.name.includes('Google') || v.name.includes('Natural')) && v.lang.startsWith('en-US')) ||
                 voices.find(v => v.lang.startsWith('en-US')) || voices[0]
    if (pref) utt.voice = pref
    return new Promise((resolve) => {
      utt.onstart = () => {
        setSubtitleText(text)
        setTimeout(() => setIsSpeaking(true), 10)
      }
      utt.onend = () => {
        setIsSpeaking(false)
        setSubtitleText('')
        resolve()
      }
      utt.onerror = () => {
        setIsSpeaking(false)
        setSubtitleText('')
        resolve()
      }
      window.speechSynthesis.speak(utt)
    })
  }

  const speak = async (text) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsSpeaking(false)

      // Try ElevenLabs
      const res = await fetch(`${BASE}/api/speech/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      })

      if (!res.ok) throw new Error('ElevenLabs failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      return new Promise((resolve) => {
        audio.onplay = () => {
          setSubtitleText(text)
          setIsSpeaking(true)
        }
        audio.onended = () => {
          setIsSpeaking(false)
          setSubtitleText('')
          resolve()
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          setSubtitleText('')
          resolve()
        }
        audio.play()
      })
    } catch (err) {
      console.warn('TTS Fallback active:', err.message)
      return browserSpeakFallback(text)
    }
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
                 `I'll ask ${MAX_Q} questions. When you're ready, press "Begin".`
    await delay(1100)
    setAiTyping(false)
    addMsg('ai', text)
    setPhase('intro')
    await speak(text)
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
        await speak(data.question)
      }
    } catch {
      setAiTyping(false)
      toast.error('Connection error')
    }
  }

  // ── Submit an answer ────────────────────────────────────────────────────────
  const submitAnswer = async (manualText = null) => {
    const txt = (manualText !== null ? manualText : transcribingText).trim()
    if (!txt || loading || aiTyping) return
    
    setTranscribingText('')
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

      if (data.quickScores) setQuickScores(data.quickScores)

      if (data.feedback && !data.done) {
        setAiTyping(true)
        await delay(500)
        setAiTyping(false)
        addMsg('ai', data.feedback)
        await speak(data.feedback)
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setPhase('ending')
    setAiTyping(true)
    const text = "That wraps up our session. I'm compiling your full evaluation now. Thank you for your time."
    await delay(1000)
    setAiTyping(false)
    addMsg('ai', text)
    await speak(text)
    
    try {
      setSubmitting(true)
      await apiFetch(`/api/interviews/${id}/complete`, { method: 'POST' })
      sessionStorage.setItem(`completed_${id}`, 'true')
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

  // ── Voice recording with AUTO-SUBMIT ───────────────────────────────────────
  const toggleRecording = async () => {
    if (isSpeaking || loading) return
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
        
        setLoading(true) 
        try {
          const res  = await fetch(`${BASE}/api/speech/transcribe`, {
            method:  'POST',
            headers: { Authorization: `Bearer ${token}` },
            body:    formData,
          })
          const data = await res.json()
          setLoading(false)
          
          if (data.text && data.text.trim().length > 2) {
             setTranscribingText(data.text)
             await delay(1200) 
             await submitAnswer(data.text)
          } else if (data.text) {
             toast.error("Answer too short, please try again")
          }
        } catch { 
          setLoading(false)
          toast.error('Transcription failed') 
        }
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

  if (phase === 'loading') {
    return (
      <div className="h-screen bg-void flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-electric animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-void flex flex-col overflow-hidden">
      
      {/* Header bar */}
      <div className="h-14 glass border-b border-border px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-text-secondary text-xs md:text-sm capitalize font-medium">
            {interview?.type} Interview · {interview?.company || 'Standard'}
          </span>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <div className="w-16 md:w-32 h-1.5 bg-border rounded-full overflow-hidden hidden xs:block">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(qCount / MAX_Q) * 100}%`, background: 'linear-gradient(90deg, #4f8ef7, #22d3ee)' }}
              />
            </div>
            <span className="font-mono text-[10px] md:text-xs text-text-secondary">{qCount}/{MAX_Q}</span>
          </div>
          {timerOn && (
            <div className="flex items-center gap-1.5 font-mono text-xs md:text-sm text-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span className={timer > 120 ? 'text-warning' : ''}>{fmt(timer)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-3 md:p-4 grid grid-cols-1 lg:grid-cols-[1fr_350px] xl:grid-cols-[1fr_400px] gap-3 md:gap-4">
        
        {/* Left: AI Avatar Panel */}
        <div className="relative glass rounded-2xl md:rounded-3xl overflow-hidden flex flex-col items-center border border-border/40 min-h-[300px]">
           <div className="absolute top-4 right-4 md:top-6 md:right-6 px-3 py-1 rounded-full glass-bright border border-electric/30 text-[10px] font-bold text-electric z-10">
              QUESTION {qCount} / {MAX_Q}
           </div>

           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-6">
              <div className="relative group">
                <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full bg-panel border-2 md:border-4 border-border/60 transition-all duration-500 flex items-center justify-center overflow-hidden relative ${isSpeaking ? 'speaking-ring scale-105' : ''}`}>
                   <div className="w-full h-full bg-electric-gradient flex items-center justify-center">
                      <Brain className="w-18 h-18 md:w-28 md:h-28 text-white opacity-90" />
                   </div>
                   {isSpeaking && (
                     <div className="absolute bottom-8 md:bottom-12 flex gap-1 items-end h-6 md:h-10">
                       {[1,2,3,4,5].map(i => (
                         <div key={i} className="mouth-bar" style={{ animationDelay: `${i * 0.12}s` }} />
                       ))}
                     </div>
                   )}
                </div>
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">Alex Chen</h2>
                <p className="text-[10px] md:text-xs text-text-secondary uppercase tracking-[0.2em] font-bold">Senior Technical Interviewer</p>
              </div>

              <div className="h-8 md:h-12 flex items-center gap-1.5">
                {isSpeaking ? (
                  [1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                    <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.08}s` }} />
                  ))
                ) : (
                  <div className="h-0.5 w-32 bg-border/40 rounded-full opacity-30" />
                )}
              </div>
           </div>

           <AnimatePresence>
             {isSpeaking && (
               <div className="absolute inset-0 z-40 flex flex-col items-center justify-end pb-24 pointer-events-none">
                  <div className="px-10 mb-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="max-w-3xl bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl px-8 py-5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                    >
                      <p className="text-base md:text-lg lg:text-xl text-white font-semibold leading-relaxed tracking-tight">
                        {subtitleText}
                      </p>
                    </motion.div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-4 py-2 rounded-full bg-electric/20 border border-electric/30 text-electric text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 shadow-lg backdrop-blur-md"
                  >
                    <div className="w-2 h-2 rounded-full bg-electric animate-pulse shadow-[0_0_8px_#4f8ef7]" />
                    INTERVIEWER IS SPEAKING
                  </motion.div>
               </div>
             )}
           </AnimatePresence>
        </div>

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-3 md:gap-4 overflow-hidden">
          
          <div className="glass rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col items-center border border-border/40 shrink-0">
            <div className="w-full aspect-video md:h-36 bg-void rounded-lg border border-border/50 flex items-center justify-center relative overflow-hidden group">
               <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover rounded-lg transform scale-x-[-1]" 
               />
               <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white backdrop-blur-sm">
                 <Video className="w-2.5 h-2.5 text-success" /> LIVE FEED
               </div>
               
               {recording && (
                 <div className="absolute inset-0 bg-danger/10 flex flex-col items-center justify-center">
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-danger/80 text-white text-[9px] font-bold animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" /> REC
                    </div>
                    <div className="flex gap-1 items-end h-8">
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="wave-bar-sm" style={{ animationDelay: `${i * 0.1}s`, backgroundColor: 'white' }} />
                      ))}
                    </div>
                 </div>
               )}
            </div>
            <div className="mt-2.5 flex items-center justify-between w-full px-1">
              <span className="text-[10px] font-bold text-text-secondary truncate tracking-tight">{user?.name || 'Candidate'}</span>
              <div className="flex gap-1">
                 <div className={`w-1.5 h-1.5 rounded-full ${recording ? 'bg-danger' : 'bg-success'}`} />
                 <div className="w-1.5 h-1.5 rounded-full bg-border" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-3 md:gap-4 overflow-hidden">
            <div className="glass rounded-xl border border-border/40 overflow-hidden shrink-0">
               <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-electric" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Session Analytics</span>
               </div>
               <div className="grid grid-cols-4 lg:grid-cols-2 gap-px bg-border/20">
                  {[
                    { label: 'Clarity', val: quickScores.clarity, color: 'text-electric' },
                    { label: 'Depth', val: quickScores.depth, color: 'text-cyan-400' },
                    { label: 'Confidence', val: quickScores.confidence, color: 'text-success' },
                    { label: 'Relevance', val: quickScores.relevance, color: 'text-warning' }
                  ].map(s => (
                    <div key={s.label} className="bg-panel p-2 md:p-3 flex flex-col items-center justify-center">
                       <span className={`text-base md:text-lg font-bold ${s.color}`}>{s.val ?? '—'}</span>
                       <span className="text-[8px] md:text-[9px] text-text-muted uppercase font-bold mt-0.5">{s.label}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="glass rounded-xl border border-border/40 flex-1 flex flex-col overflow-hidden min-h-0">
               <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-electric" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Discussion Stream</span>
               </div>
               <div ref={chatRef} className="flex-1 transcript-scroll p-4 space-y-4 overflow-y-auto">
                  {messages.length === 0 && !transcribingText && (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-30 space-y-2">
                       <MessageSquare className="w-8 h-8" />
                       <p className="text-[11px] font-medium uppercase tracking-widest">Awaiting interaction</p>
                    </div>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                       <div className={`flex items-center gap-2 mb-1 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${msg.role === 'ai' ? 'text-electric' : 'text-text-muted'}`}>
                            {msg.role === 'ai' ? 'Interviewer (Alex Chen)' : 'You (Candidate)'}
                          </span>
                       </div>
                       <div className={`max-w-[90%] rounded-xl px-3 py-2 text-[11px] leading-relaxed shadow-sm ${
                         msg.role === 'ai' 
                         ? 'bg-electric/10 border border-electric/20 text-text-primary' 
                         : 'bg-panel border border-border/50 text-text-primary'
                       }`}>
                          {msg.content}
                       </div>
                    </div>
                  ))}
                  
                  <AnimatePresence>
                    {transcribingText && (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col items-end"
                      >
                         <span className="text-[9px] font-bold uppercase tracking-wider text-electric mb-1 px-1">You (Transcribing...)</span>
                         <div className="max-w-[90%] rounded-xl px-3 py-2 text-[11px] leading-relaxed bg-electric/5 border border-dashed border-electric/40 text-text-secondary italic">
                            {transcribingText}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {aiTyping && (
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] font-bold uppercase text-electric mb-1 px-1">Interviewer (Thinking...)</span>
                      <div className="flex gap-1.5 p-2 bg-electric/10 rounded-xl border border-electric/20">
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
      </div>

      {/* Bottom Controls */}
      <div className="h-28 md:h-32 border-t border-border/40 glass p-3 md:p-4 shrink-0 z-20">
        <div className="max-w-4xl mx-auto flex flex-col items-center h-full justify-between">
          
          <div className="text-[10px] text-text-muted font-black tracking-widest uppercase flex items-center gap-2">
             {phase === 'intro' ? 'Interviewer system online' : 
              phase === 'qa' ? (recording ? 'Recording capture active...' : (loading ? 'Analyzing response...' : 'Select microphone to speak')) :
              'Session finalized'}
          </div>

          <div className="w-full flex items-center justify-center gap-6 md:gap-16">
            {phase === 'qa' && (
              <button
                onClick={handleEndSession}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-danger/20 text-danger/40 hover:text-danger hover:bg-danger/10 transition-all hover:scale-110 active:scale-90"
                title="End Session"
              >
                 <PhoneOff className="w-5 h-5" />
              </button>
            )}

            {phase === 'intro' ? (
              <button
                onClick={beginInterview}
                disabled={aiTyping}
                className="btn-primary py-3 px-10 md:py-4 md:px-20 glow-electric text-sm md:text-base font-black tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                <Brain className="w-4 h-4 md:w-6 md:h-6" />
                COMMENCE INTERVIEW
              </button>
            ) : phase === 'qa' ? (
              <div className="relative group">
                <button
                  onClick={toggleRecording}
                  disabled={isSpeaking || loading}
                  className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
                    recording 
                    ? 'bg-danger text-white scale-110 ring-8 ring-danger/20' 
                    : 'bg-void border-2 border-electric text-electric hover:bg-electric hover:text-white'
                  } disabled:opacity-20`}
                >
                   {loading ? <Loader2 className="w-6 h-6 md:w-10 md:h-10 animate-spin" /> : 
                    (recording ? <MicOff className="w-6 h-6 md:w-10 md:h-10" /> : <Mic className="w-6 h-6 md:w-10 md:h-10" />)}
                </button>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-text-muted whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity tracking-[0.1em]">
                  {recording ? 'CLICK TO STOP' : (loading ? 'PROCESSING' : 'PRESS TO TALK')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-success font-black text-xs uppercase tracking-[0.2em] animate-pulse">
                <CheckCircle2 className="w-5 h-5" /> GENERATING EVALUATION
              </div>
            )}

            {phase === 'qa' && <div className="w-10 md:w-12" />}
          </div>
        </div>
      </div>

    </div>
  )
}
