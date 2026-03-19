const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name too long'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },

  // Multiple resumes support
  resumes: [{
    _id: mongoose.Schema.Types.ObjectId,
    originalName: String,
    text: String,
    uploadedAt: Date,
    skills: [{ type: String, trim: true }],
    technologies: [{ type: String, trim: true }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      year: String,
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
    }],
    experience: [{
      company: String,
      role: String,
      duration: String,
      description: String,
    }],
    seniorityLevel: { type: String, enum: ['junior', 'mid', 'senior', null], default: null },
    primaryDomain:  { type: String, default: null },
    atsScore: { type: Number, min: 0, max: 100, default: null },
    atsBreakdown: {
      keywordMatch: { type: Number, min: 0, max: 100, default: null },
      format: { type: Number, min: 0, max: 100, default: null },
      achievements: { type: Number, min: 0, max: 100, default: null },
      completeness: { type: Number, min: 0, max: 100, default: null },
      skillsClarity: { type: Number, min: 0, max: 100, default: null },
    },
    atsFeedback: [String],
    atsStrengths: [String],
  }],
  activeResumeId: mongoose.Schema.Types.ObjectId,

  // Legacy support (skills/technologies from latest resume)
  skills: [{ type: String, trim: true }],
  technologies: [{ type: String, trim: true }],
  education: [{
    institution: String,
    degree: String,
    field: String,
    year: String,
  }],
  projects: [{
    name: String,
    description: String,
    technologies: [String],
  }],
  experience: [{
    company: String,
    role: String,
    duration: String,
    description: String,
  }],

  // Resume metadata (from active resume)
  seniorityLevel: { type: String, enum: ['junior', 'mid', 'senior', null], default: null },
  primaryDomain:  { type: String, default: null },

  // Gamification
  streak: { type: Number, default: 0 },
  lastInterviewDate: Date,
  badges: [{ type: String }],
  totalInterviews: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },

}, { timestamps: true })

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare passwords
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

// Update streak logic
userSchema.methods.updateStreak = function () {
  const now = new Date()
  const last = this.lastInterviewDate

  if (!last) {
    this.streak = 1
  } else {
    const daysDiff = Math.floor((now - last) / (1000 * 60 * 60 * 24))
    if (daysDiff === 1) this.streak += 1
    else if (daysDiff > 1) this.streak = 1
    // same day: no change
  }
  this.lastInterviewDate = now
}

// Award badges
userSchema.methods.checkBadges = function () {
  const earned = new Set(this.badges)
  if (this.totalInterviews >= 1) earned.add('first_interview')
  if (this.streak >= 3) earned.add('streak_3')
  if (this.averageScore >= 8) earned.add('high_scorer')
  if (this.totalInterviews >= 5) earned.add('consistent')
  this.badges = [...earned]
}

module.exports = mongoose.model('User', userSchema)