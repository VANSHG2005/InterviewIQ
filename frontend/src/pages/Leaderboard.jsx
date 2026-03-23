import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Medal, Crown, Star, Home, ChevronRight, Loader2, Zap, Brain } from 'lucide-react'
import { apiFetch } from '../context/auth.js'

export default function Leaderboard() {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch('/api/users/leaderboard')
        setRankings(data.rankings || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-void flex items-center justify-center pt-16">
      <Loader2 className="w-8 h-8 text-electric animate-spin" />
    </div>
  )

  const top3 = rankings.slice(0, 3)
  const rest = rankings.slice(3)

  return (
    <div className="min-h-screen bg-void pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        
        <div className="flex items-center gap-2 text-text-muted text-sm mb-6">
          <Link to="/dashboard" className="hover:text-text-secondary transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Global Leaderboard</span>
        </div>

        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-warning/20 border border-warning/30 mb-4"
          >
            <Trophy className="w-8 h-8 text-warning shadow-glow-warning" />
          </motion.div>
          <h1 className="font-display text-4xl font-bold text-text-primary mb-2">Global Rankings</h1>
          <p className="text-text-secondary text-sm">Top interview performers in the InterviewIQ community</p>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
          {top3.map((user, i) => {
            const isFirst = user.rank === 1
            const isSecond = user.rank === 2
            const isThird = user.rank === 3
            
            const order = isFirst ? 'order-1 md:order-2 md:-translate-y-4' : isSecond ? 'order-2 md:order-1' : 'order-3'
            const color = isFirst ? 'text-warning' : isSecond ? 'text-slate-300' : 'text-amber-600'
            const bg = isFirst ? 'bg-warning/10 border-warning/30' : isSecond ? 'bg-slate-300/10 border-slate-300/30' : 'bg-amber-600/10 border-amber-600/30'

            return (
              <motion.div
                key={user._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${order} glass rounded-3xl p-6 text-center border-2 ${user.isMe ? 'border-electric shadow-[0_0_20px_rgba(79,142,247,0.2)]' : 'border-border/40'}`}
              >
                <div className="relative inline-block mb-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold ${bg} border`}>
                    {user.name[0]}
                  </div>
                  <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-void border-2 border-border flex items-center justify-center ${color}`}>
                    {isFirst ? <Crown className="w-4 h-4 fill-current" /> : user.rank}
                  </div>
                </div>
                <h3 className="font-display font-bold text-text-primary truncate px-2">{user.name} {user.isMe && '(You)'}</h3>
                <div className="flex items-center justify-center gap-1 text-neon font-mono text-sm mt-1">
                  <Zap className="w-3 h-3 fill-neon" /> {user.points} XP
                </div>
                <div className="mt-3 flex items-center justify-center gap-1">
                   <div className="bg-white/5 border border-border/40 px-2 py-0.5 rounded text-[10px] text-text-muted font-bold uppercase tracking-widest">
                     Level {user.level}
                   </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* List for the rest */}
        <div className="glass rounded-3xl overflow-hidden border border-border/40">
          <div className="bg-white/5 px-6 py-4 border-b border-border/40 grid grid-cols-12 text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-7 pl-4">Candidate</div>
            <div className="col-span-2 text-center">Level</div>
            <div className="col-span-2 text-right">Experience</div>
          </div>
          <div className="divide-y divide-border/20">
            {rest.map((user) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`grid grid-cols-12 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors ${user.isMe ? 'bg-electric/5' : ''}`}
              >
                <div className="col-span-1 text-center font-mono font-bold text-text-muted">{user.rank}</div>
                <div className="col-span-7 pl-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-void border border-border/40 flex items-center justify-center text-xs font-bold text-text-secondary">
                    {user.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{user.name} {user.isMe && <span className="text-[10px] text-electric ml-1 font-bold tracking-widest uppercase">YOU</span>}</p>
                    <div className="flex gap-1 mt-0.5">
                      {user.badges?.slice(0, 3).map((badge, i) => (
                         <span key={i} className="w-2 h-2 rounded-full bg-electric/40" title={badge} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-center">
                   <span className="text-xs font-bold text-text-secondary bg-border/40 px-2 py-0.5 rounded-md">Lv.{user.level}</span>
                </div>
                <div className="col-span-2 text-right">
                  <div className="text-sm font-bold text-neon font-mono flex items-center justify-end gap-1">
                    <Zap className="w-3 h-3 fill-neon" /> {user.points}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-8 glass rounded-2xl p-6 border border-electric/20 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-electric/10 flex items-center justify-center border border-electric/30">
                 <Brain className="w-6 h-6 text-electric" />
              </div>
              <div>
                 <p className="text-sm font-bold text-text-primary">Boost your ranking</p>
                 <p className="text-xs text-text-muted mt-0.5">Complete more interviews with high scores to climb the board.</p>
              </div>
           </div>
           <Link to="/dashboard" className="btn-primary py-2 px-6 text-xs font-bold glow-electric">
              PRACTICE NOW
           </Link>
        </div>
      </div>
    </div>
  )
}
