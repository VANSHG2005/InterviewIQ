const mongoose = require('mongoose')

const weakTopicSchema = new mongoose.Schema({
  topic: String,
  description: String,
  severity: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
}, { _id: false })

const roadmapWeekSchema = new mongoose.Schema({
  week: Number,
  title: String,
  description: String,
  resources: [String],
  topics: [String],
}, { _id: false })

const questionBreakdownSchema = new mongoose.Schema({
  question: String,
  answer: String,
  score: { type: Number, min: 0, max: 10 },
  feedback: String,
  idealAnswer: String,
  category: String,
}, { _id: false })

const reportSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  scores: {
    technical: Number,
    communication: Number,
    confidence: Number,
    depth: Number,
    problemSolving: Number,
    overall: Number,
  },

  aiSummary: String,
  strengths: [String],
  weakTopics: [weakTopicSchema],
  suggestions: [String],
  questionBreakdown: [questionBreakdownSchema],
  roadmap: [roadmapWeekSchema],

  generatedAt: { type: Date, default: Date.now },

}, { timestamps: true })

module.exports = mongoose.model('Report', reportSchema)
