const express = require('express')
const auth = require('../middleware/auth')
const Report = require('../models/Report')
const Interview = require('../models/Interview')

const router = express.Router()

// ─── GET /api/reports/:interviewId ────────────────────────────────────────────
router.get('/:interviewId', auth, async (req, res) => {
  try {
    // Verify ownership through interview
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      userId: req.user._id,
    })
    if (!interview) return res.status(404).json({ message: 'Interview not found' })

    const report = await Report.findOne({ interviewId: req.params.interviewId })
    if (!report) return res.status(404).json({ message: 'Report not found — interview may not be complete' })

    res.json({ report })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to fetch report' })
  }
})

// ─── GET /api/reports — list all user's reports ───────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user._id })
      .sort({ generatedAt: -1 })
      .limit(20)
      .lean()

    res.json({ reports })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reports' })
  }
})

module.exports = router
