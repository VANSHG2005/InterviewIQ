const express = require('express')
const auth = require('../middleware/auth')
const Interview = require('../models/Interview')
const Report = require('../models/Report')
const User = require('../models/User')
const {
  generateFirstQuestion,
  generateNextQuestion,
  quickScoreAnswer,
  generateBriefFeedback,
  evaluateInterview,
} = require('../services/groqService')

const router = express.Router()
const MAX_QUESTIONS = 8

// ─── POST /api/interviews — create a new session ──────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { type = 'technical', company = '', difficulty = 'mid', resumeId } = req.body

    const interview = await Interview.create({
      userId: req.user._id,
      resumeId: resumeId || undefined,
      type,
      company: company || undefined,
      difficulty,
      questions: [],
      answers: [],
    })

    res.status(201).json({ interview })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Could not create interview session' })
  }
})

// ─── GET /api/interviews — list user's interviews ─────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)
    const page = parseInt(req.query.page) || 1
    const skip = (page - 1) * limit

    const interviews = await Interview.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Interview.countDocuments({ userId: req.user._id })

    res.json({ interviews, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch interviews' })
  }
})

// ─── GET /api/interviews/stats — dashboard stats ──────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.user._id,
      completed: true,
    }).sort({ createdAt: 1 }).lean()

    const total = interviews.length
    const scores = interviews.map(iv => iv.scores?.overall || 0).filter(Boolean)
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const bestScore = scores.length ? Math.max(...scores) : 0

    const scoreHistory = interviews.slice(-10).map(iv => ({
      date: iv.completedAt || iv.createdAt,
      score: iv.scores?.overall || 0,
      type: iv.type
    }))

    // Fetch reports for skill gaps and roadmap
    const reports = await Report.find({ userId: req.user._id })
      .sort({ generatedAt: -1 })
      .lean()

    // Aggregate skill gaps
    const skillGapsMap = {}
    const missingConcepts = []
    
    reports.forEach(report => {
      if (report.weakTopics) {
        report.weakTopics.forEach(wt => {
          skillGapsMap[wt.topic] = (skillGapsMap[wt.topic] || 0) + 1
        })
      }
      if (report.questionBreakdown) {
        report.questionBreakdown.forEach(qb => {
          if (qb.score < 6 && qb.feedback) {
            missingConcepts.push(qb.feedback)
          }
        })
      }
    })

    const skillGaps = Object.entries(skillGapsMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const latestRoadmap = reports.length > 0 ? reports[0].roadmap : []

    const user = await User.findById(req.user._id).select('streak badges points level totalPoints')

    res.json({
      total,
      avgScore: parseFloat(avgScore.toFixed(2)),
      bestScore: parseFloat(bestScore.toFixed(2)),
      streak: user?.streak || 0,
      badges: user?.badges || [],
      points: user?.points || 0,
      level: user?.level || 1,
      totalPoints: user?.totalPoints || 0,
      scoreHistory,
      skillGaps,
      missingConcepts: missingConcepts.slice(0, 10),
      latestRoadmap
    })
  } catch (err) {
    console.error('Stats error:', err)
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

// ─── GET /api/interviews/:id — get one interview ──────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!interview) return res.status(404).json({ message: 'Interview not found' })
    res.json({ interview })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch interview' })
  }
})

// ─── POST /api/interviews/:id/question — get next AI question ─────────────────
router.post('/:id/question', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!interview) return res.status(404).json({ message: 'Interview not found' })
    if (interview.completed) return res.status(400).json({ message: 'Interview already completed' })

    const questionNumber = interview.questions.length + 1

    // Check if we've hit max questions
    if (questionNumber > MAX_QUESTIONS) {
      return res.json({ done: true })
    }

    const user = req.user
    let questionText

    if (questionNumber === 1) {
      questionText = await generateFirstQuestion(interview, user)
    } else {
      // Build Q&A history for context
      const qas = interview.questions.map((q, i) => ({
        question: q.text,
        answer: interview.answers[i]?.text || '',
        quickScore: interview.adaptations?.[i]?.adjustment || 5,
      }))

      questionText = await generateNextQuestion(interview, user, qas, questionNumber)
    }

    // Detect category
    const category = detectCategory(questionText, interview.type)

    // Save question
    interview.questions.push({
      text: questionText,
      category,
      difficulty: interview.currentDifficulty || 5,
      order: questionNumber,
    })
    await interview.save()

    res.json({
      question: questionText,
      questionNumber,
      total: MAX_QUESTIONS,
      done: false,
    })
  } catch (err) {
    console.error('Question generation error:', err)
    res.status(500).json({ message: 'Failed to generate question' })
  }
})

// ─── POST /api/interviews/:id/answer — submit an answer ──────────────────────
router.post('/:id/answer', auth, async (req, res) => {
  try {
    const { answer, questionIndex, duration } = req.body

    if (!answer || answer.trim().length < 2) {
      return res.status(400).json({ message: 'Answer cannot be empty' })
    }

    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!interview) return res.status(404).json({ message: 'Interview not found' })
    if (interview.completed) return res.status(400).json({ message: 'Interview already completed' })

    const qIndex = questionIndex ?? interview.answers.length
    const question = interview.questions[qIndex]
    if (!question) return res.status(400).json({ message: 'Question not found' })

    // Quick score for adaptive difficulty
    const quickScores = await quickScoreAnswer(question.text, answer)
    const quickScore = quickScores.overall || Math.round((quickScores.clarity + quickScores.depth + quickScores.confidence + quickScores.relevance) / 4)

    // Adaptive difficulty adjustment
    const currentDiff = interview.currentDifficulty || 5
    let newDiff = currentDiff
    if (quickScore >= 8 && currentDiff < 9) newDiff = Math.min(10, currentDiff + 1)
    else if (quickScore <= 3 && currentDiff > 2) newDiff = Math.max(1, currentDiff - 1)

    // Brief feedback (mid-interview only)
    const isLastQuestion = interview.questions.length >= MAX_QUESTIONS
    const feedback = !isLastQuestion
      ? await generateBriefFeedback(question.text, answer, qIndex + 1, MAX_QUESTIONS)
      : null

    // Save answer
    if (interview.answers[qIndex]) {
      interview.answers[qIndex] = { text: answer.trim(), duration, submittedAt: new Date() }
    } else {
      interview.answers.push({ text: answer.trim(), duration, submittedAt: new Date() })
    }

    // Track adaptation
    interview.currentDifficulty = newDiff
    if (!interview.adaptations) interview.adaptations = []
    interview.adaptations.push({ questionIndex: qIndex, reason: 'score', adjustment: quickScore })

    await interview.save()

    const done = interview.answers.length >= MAX_QUESTIONS

    res.json({
      feedback,
      quickScores,
      done,
      answers: interview.answers.map(a => ({ text: a.text })),
    })
  } catch (err) {
    console.error('Answer submission error:', err)
    res.status(500).json({ message: 'Failed to save answer' })
  }
})

// ─── POST /api/interviews/:id/complete — finalize + generate report ───────────
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!interview) return res.status(404).json({ message: 'Interview not found' })
    if (interview.completed) return res.json({ message: 'Already completed', interviewId: interview._id })

    if (interview.questions.length === 0) {
      return res.status(400).json({ message: 'No questions recorded' })
    }

    // Build Q&A pairs for evaluation
    const questionsAndAnswers = interview.questions.map((q, i) => ({
      question: q.text,
      answer: interview.answers[i]?.text || '(no answer provided)',
    }))

    // Run full AI evaluation
    const evaluation = await evaluateInterview(interview, req.user, questionsAndAnswers)

    // Calculate overall score
    const s = evaluation.scores || {}
    const scoreVals = [s.technical, s.communication, s.confidence, s.depth, s.problemSolving].filter(v => v != null)
    const overall = scoreVals.length
      ? parseFloat((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length).toFixed(2))
      : 6.0

    // Update interview
    interview.scores = { ...s, overall }
    interview.completed = true
    interview.completedAt = new Date()
    await interview.save()

    // Save report
    const report = await Report.findOneAndUpdate(
      { interviewId: interview._id },
      {
        interviewId: interview._id,
        userId: req.user._id,
        scores: { ...s, overall },
        aiSummary: evaluation.aiSummary,
        strengths: evaluation.strengths || [],
        weakTopics: evaluation.weakTopics || [],
        suggestions: evaluation.suggestions || [],
        questionBreakdown: evaluation.questionBreakdown || [],
        roadmap: evaluation.roadmap || [],
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    )

    // Update user stats
    const user = await User.findById(req.user._id)
    user.totalInterviews = (user.totalInterviews || 0) + 1
    user.updateStreak()

    // Award points
    const basePoints = 50
    const scoreBonus = Math.floor(overall * 10)
    const streakBonus = (user.streak || 0) * 5
    const earned = basePoints + scoreBonus + streakBonus
    
    user.points = (user.points || 0) + earned
    user.totalPoints = (user.totalPoints || 0) + earned
    
    // Level up logic (1000 XP per level)
    user.level = Math.floor(user.totalPoints / 1000) + 1

    // Recalculate average score
    const allInterviews = await Interview.find({ userId: user._id, completed: true }).select('scores')
    const allScores = allInterviews.map(iv => iv.scores?.overall || 0).filter(Boolean)
    user.averageScore = allScores.length
      ? parseFloat((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2))
      : 0

    user.checkBadges()
    await user.save()

    res.json({
      message: 'Interview completed',
      interviewId: interview._id,
      reportId: report._id,
      scores: interview.scores,
      earnedPoints: earned,
      totalPoints: user.points,
      level: user.level
    })
  } catch (err) {
    console.error('Completion error:', err)
    res.status(500).json({ message: 'Failed to complete interview' })
  }
})

// ─── DELETE /api/interviews/:id ───────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!interview) return res.status(404).json({ message: 'Not found' })
    await Report.findOneAndDelete({ interviewId: req.params.id })
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Delete failed' })
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectCategory(questionText, interviewType) {
  const text = questionText.toLowerCase()
  if (interviewType === 'behavioral' || text.includes('tell me about a time') || text.includes('describe a situation')) {
    return 'behavioral'
  }
  if (text.includes('follow up') || text.includes('elaborate') || text.includes('can you explain more')) {
    return 'follow_up'
  }
  return 'technical'
}

module.exports = router
