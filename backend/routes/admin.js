const express = require('express')
const auth = require('../middleware/auth')
const isAdmin = require('../middleware/admin')
const User = require('../models/User')
const Interview = require('../models/Interview')
const Report = require('../models/Report')

const router = express.Router()

// Apply both middlewares to all routes
router.use(auth, isAdmin)

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalInterviews = await Interview.countDocuments({ completed: true })
    const totalReports = await Report.countDocuments()
    
    // Last 30 days growth
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    const newInterviews = await Interview.countDocuments({ 
      completed: true, 
      completedAt: { $gte: thirtyDaysAgo } 
    })

    res.json({
      totalUsers,
      totalInterviews,
      totalReports,
      growth: {
        newUsers,
        newInterviews
      }
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admin stats' })
  }
})

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email role totalInterviews averageScore level createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    
    res.json({ users })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// ─── GET /api/admin/interviews ────────────────────────────────────────────────
router.get('/interviews', async (req, res) => {
  try {
    const interviews = await Interview.find({ completed: true })
      .populate('userId', 'name email')
      .sort({ completedAt: -1 })
      .limit(50)
      .lean()
    
    res.json({ interviews })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch interviews' })
  }
})

module.exports = router
