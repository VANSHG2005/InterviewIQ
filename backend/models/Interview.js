const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  category: String,          // 'technical' | 'behavioral' | 'follow_up'
  difficulty: { type: Number, min: 1, max: 10, default: 5 },
  order: Number,
}, { _id: false })

const answerSchema = new mongoose.Schema({
  text: { type: String, required: true },
  duration: Number,          // seconds taken
  submittedAt: Date,
}, { _id: false })

const scoreSchema = new mongoose.Schema({
  technical: { type: Number, min: 0, max: 10, default: 0 },
  communication: { type: Number, min: 0, max: 10, default: 0 },
  confidence: { type: Number, min: 0, max: 10, default: 0 },
  depth: { type: Number, min: 0, max: 10, default: 0 },
  problemSolving: { type: Number, min: 0, max: 10, default: 0 },
  overall: { type: Number, min: 0, max: 10, default: 0 },
}, { _id: false })

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  type: {
    type: String,
    enum: ['technical', 'behavioral', 'hr', 'company'],
    default: 'technical',
  },
  company: String,           // for company-style interviews
  difficulty: {
    type: String,
    enum: ['junior', 'mid', 'senior'],
    default: 'mid',
  },

  questions: [questionSchema],
  answers: [answerSchema],

  scores: scoreSchema,
  completed: { type: Boolean, default: false },
  completedAt: Date,

  // Adaptive difficulty tracking
  currentDifficulty: { type: Number, default: 5 },
  adaptations: [{ questionIndex: Number, reason: String, adjustment: Number }],

}, { timestamps: true })

// Auto-calculate overall score before save
interviewSchema.pre('save', function (next) {
  if (this.scores && this.completed) {
    const s = this.scores
    const vals = [s.technical, s.communication, s.confidence, s.depth, s.problemSolving].filter(Boolean)
    s.overall = vals.length > 0
      ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
      : 0
  }
  next()
})

module.exports = mongoose.model('Interview', interviewSchema)
