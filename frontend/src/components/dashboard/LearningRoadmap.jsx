import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, BookOpen, ChevronRight } from 'lucide-react'

export default function LearningRoadmap({ roadmap = [] }) {
  if (!roadmap || roadmap.length === 0) return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center opacity-40"
    >
      <Calendar className="w-10 h-10 mb-3" />
      <p className="text-sm font-medium">No Roadmap Generated</p>
      <p className="text-xs mt-1">Complete an interview to get your personalized plan</p>
    </motion.div>
  )

  const currentWeek = roadmap[0] // focus on week 1 for dashboard summary

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass rounded-2xl p-6 h-full border-l-4 border-l-neon"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-neon" />
          <h2 className="font-display font-semibold text-text-primary">Personalized Roadmap</h2>
        </div>
        <span className="text-[10px] uppercase tracking-widest bg-neon/10 text-neon px-2 py-0.5 rounded-full border border-neon/20">Active Focus</span>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-neon/15 flex items-center justify-center text-xs font-bold text-neon border border-neon/20">W1</div>
          <h3 className="text-sm font-semibold text-text-primary">{currentWeek.title}</h3>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
          {currentWeek.description}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Recommended Topics</p>
        <div className="flex flex-wrap gap-1.5">
          {currentWeek.topics?.slice(0, 4).map((topic, i) => (
            <span key={i} className="text-[10px] bg-white/5 border border-border/40 px-2 py-1 rounded-lg text-text-secondary">
              {topic}
            </span>
          ))}
          {currentWeek.topics?.length > 4 && (
            <span className="text-[10px] text-text-muted flex items-center">+{currentWeek.topics.length - 4} more</span>
          )}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-border/20">
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{currentWeek.resources?.length || 0} resources ready</span>
          </div>
          <button className="text-neon flex items-center gap-0.5 font-medium hover:gap-1.5 transition-all">
            Full Roadmap <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
