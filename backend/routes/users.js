const express = require('express')
const auth = require('../middleware/auth')
const User = require('../models/User')

const router = express.Router()

// ─── GET /api/users/leaderboard — global rankings ──────────────────────────────
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const topUsers = await User.find({})
      .select('name points level badges totalInterviews')
      .sort({ totalPoints: -1 })
      .limit(10)
      .lean()

    // Add rank and mask emails
    const rankings = topUsers.map((user, index) => ({
      _id: user._id,
      name: user.name,
      points: user.points || 0,
      level: user.level || 1,
      badges: user.badges || [],
      totalInterviews: user.totalInterviews || 0,
      rank: index + 1,
      isMe: user._id.toString() === req.user._id.toString()
    }))

    res.json({ rankings })
  } catch (err) {
    console.error('Leaderboard error:', err)
    res.status(500).json({ message: 'Failed to fetch leaderboard' })
  }
})

// ─── GET /api/users/me — current user profile with extra stats ───────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean()
    
    res.json({ user })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
})

module.exports = router
