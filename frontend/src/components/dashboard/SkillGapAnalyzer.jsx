import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react'

export default function SkillGapAnalyzer({ gaps = [], concepts = [] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl p-6 h-full"
    >
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h2 className="font-display font-semibold text-text-primary">Skill Gap Analyzer</h2>
      </div>

      {gaps.length === 0 ? (
        <div className="text-center py-8 opacity-40">
          <p className="text-sm">Complete more interviews to see gaps</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Weak Topics (Frequency)</p>
            <div className="space-y-2">
              {gaps.map((gap, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 bg-void/50 rounded-full h-2 overflow-hidden border border-border/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (gap.count / 5) * 100)}%` }}
                      className="h-full bg-warning"
                    />
                  </div>
                  <span className="text-xs font-medium text-text-primary min-w-[100px] truncate">{gap.topic}</span>
                  <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-md bg-border/40">{gap.count}x</span>
                </div>
              ))}
            </div>
          </div>

          {concepts.length > 0 && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Key Concepts to Revisit</p>
              <div className="space-y-2">
                {concepts.slice(0, 3).map((concept, i) => (
                  <div key={i} className="flex gap-2 p-2.5 rounded-xl bg-warning/5 border border-warning/10">
                    <Lightbulb className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{concept}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
