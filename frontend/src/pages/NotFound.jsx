import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-danger/10 flex items-center justify-center mx-auto mb-8 border border-danger/20">
          <AlertCircle className="w-12 h-12 text-danger" />
        </div>
        <h1 className="text-6xl font-display font-black text-text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Page Not Found</h2>
        <p className="text-text-secondary mb-10 leading-relaxed">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/dashboard" className="btn-primary flex-1 justify-center py-3.5">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <button onClick={() => window.history.back()} className="btn-ghost flex-1 justify-center py-3.5">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </motion.div>
    </div>
  )
}
