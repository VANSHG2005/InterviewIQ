const express  = require('express')
const multer   = require('multer')
const pdfParse = require('pdf-parse')
const mongoose = require('mongoose')
const auth     = require('../middleware/auth')
const User     = require('../models/User')
const { analyzeResume, predictATSScore } = require('../services/groqService')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (ok.includes(file.mimetype) || /\.(pdf|txt|doc|docx)$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, TXT, DOC, DOCX files are allowed'))
    }
  },
})

// ─── POST /api/resume/upload ──────────────────────────────────────────────────
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    let resumeText = ''

    if (/\.pdf$/i.test(req.file.originalname) || req.file.mimetype === 'application/pdf') {
      try {
        const parsed = await pdfParse(req.file.buffer)
        resumeText = parsed.text
      } catch (e) {
        return res.status(400).json({ message: 'Could not read PDF — try uploading as a .txt file' })
      }
    } else {
      resumeText = req.file.buffer.toString('utf-8')
    }

    resumeText = resumeText.replace(/\s+/g, ' ').trim()
    if (resumeText.length < 50) {
      return res.status(400).json({ message: 'Resume is too short or unreadable' })
    }

    // AI extraction
    const extracted = await analyzeResume(resumeText)

    const newResumeId = new mongoose.Types.ObjectId()
    const newResume = {
      _id: newResumeId,
      originalName: req.file.originalname,
      text:         resumeText.slice(0, 8000),
      uploadedAt:   new Date(),
      skills:       extracted.skills       || [],
      technologies: extracted.technologies || [],
      education:    extracted.education    || [],
      projects:     extracted.projects     || [],
      experience:   extracted.experience   || [],
      seniorityLevel: extracted.seniorityLevel || null,
      primaryDomain:  extracted.primaryDomain  || null,
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: { resumes: newResume },
        activeResumeId: newResumeId,
        // Also update top-level fields for backwards compatibility
        skills:       newResume.skills,
        technologies: newResume.technologies,
        education:    newResume.education,
        projects:     newResume.projects,
        experience:   newResume.experience,
        seniorityLevel: newResume.seniorityLevel,
        primaryDomain:  newResume.primaryDomain,
      },
      { new: true }
    )

    res.json({
      message: 'Resume added successfully',
      resumeId: newResumeId,
      data: {
        fileName:     req.file.originalname,
        uploadedAt:   newResume.uploadedAt,
        skills:       newResume.skills,
        technologies: newResume.technologies,
        education:    newResume.education,
        projects:     newResume.projects,
        experience:   newResume.experience,
        seniorityLevel: newResume.seniorityLevel,
        primaryDomain:  newResume.primaryDomain,
        charCount:    resumeText.length,
      },
    })
  } catch (err) {
    console.error('Resume upload error:', err)
    res.status(500).json({ message: 'Resume processing failed: ' + err.message })
  }
})

// ─── GET /api/resume/list — list all resumes ──────────────────────────────────
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const resumes = (user.resumes || []).map(r => ({
      _id: r._id,
      fileName: r.originalName,
      uploadedAt: r.uploadedAt,
      charCount: r.text?.length || 0,
      isActive: r._id?.toString() === user.activeResumeId?.toString(),
      atsScore: r.atsScore ?? null,
      atsBreakdown: r.atsBreakdown ?? null,
      atsFeedback: r.atsFeedback ?? [],
      atsStrengths: r.atsStrengths ?? [],
    }))
    res.json({ resumes })
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch resumes' })
  }
})

// ─── GET /api/resume — get current active resume data ────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const activeResume = user.resumes?.find(r => r._id?.toString() === user.activeResumeId?.toString())
    
    res.json({
      hasResume:    !!activeResume?.text,
      fileName:     activeResume?.originalName || null,
      uploadedAt:   activeResume?.uploadedAt   || null,
      skills:       activeResume?.skills       || user.skills || [],
      technologies: activeResume?.technologies || user.technologies || [],
      education:    activeResume?.education    || user.education || [],
      projects:     activeResume?.projects     || user.projects || [],
      experience:   activeResume?.experience   || user.experience || [],
      seniorityLevel: activeResume?.seniorityLevel || user.seniorityLevel || null,
      primaryDomain:  activeResume?.primaryDomain  || user.primaryDomain  || null,
      resumeCount:  user.resumes?.length || 0,
    })
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch resume' })
  }
})

// ─── PUT /api/resume/:id/select — select which resume to use ─────────────────
router.put('/:id/select', auth, async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.user._id)
    
    const resume = user.resumes?.find(r => r._id?.toString() === id)
    if (!resume) return res.status(404).json({ message: 'Resume not found' })

    await User.findByIdAndUpdate(
      req.user._id,
      {
        activeResumeId: new mongoose.Types.ObjectId(id),
        // Update top-level fields
        skills: resume.skills,
        technologies: resume.technologies,
        education: resume.education,
        projects: resume.projects,
        experience: resume.experience,
        seniorityLevel: resume.seniorityLevel,
        primaryDomain: resume.primaryDomain,
      },
      { new: true }
    )

    res.json({ message: 'Resume selected', resumeId: id })
  } catch (err) {
    res.status(500).json({ message: 'Could not select resume' })
  }
})

// ─── DELETE /api/resume/:id — delete a specific resume ───────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(req.user._id)
    
    // Check if trying to delete active resume
    if (user.activeResumeId?.toString() === id && user.resumes?.length === 1) {
      return res.status(400).json({ message: 'Cannot delete last resume. Upload a new one first.' })
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { resumes: { _id: new mongoose.Types.ObjectId(id) } } },
      { new: true }
    )

    // If deleted resume was active, set first remaining resume as active
    if (user.activeResumeId?.toString() === id && updatedUser.resumes?.length > 0) {
      updatedUser.activeResumeId = updatedUser.resumes[0]._id
      const activeResume = updatedUser.resumes[0]
      updatedUser.skills = activeResume.skills
      updatedUser.technologies = activeResume.technologies
      updatedUser.education = activeResume.education
      updatedUser.projects = activeResume.projects
      updatedUser.experience = activeResume.experience
      updatedUser.seniorityLevel = activeResume.seniorityLevel
      updatedUser.primaryDomain = activeResume.primaryDomain
      await updatedUser.save()
    }

    res.json({ message: 'Resume deleted' })
  } catch (err) {
    console.error('Resume delete error:', err)
    res.status(500).json({ message: 'Could not delete resume' })
  }
})

// ─── DELETE /api/resume — clear all resumes (legacy) ────────────────────────
router.delete('/', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      resumes: [],
      activeResumeId: null,
      $unset: {
        skills: '', technologies: '',
        education: '', projects: '', experience: '',
        seniorityLevel: '', primaryDomain: '',
      },
    })
    res.json({ message: 'All resumes cleared' })
  } catch (err) {
    res.status(500).json({ message: 'Could not clear resumes' })
  }
})

// ─── POST /api/resume/skills — manually add/edit skills ──────────────────────
router.post('/skills', auth, async (req, res) => {
  try {
    const { skills, technologies } = req.body
    const update = {}
    if (Array.isArray(skills))       update.skills       = skills.map(s => s.trim()).filter(Boolean)
    if (Array.isArray(technologies)) update.technologies = technologies.map(t => t.trim()).filter(Boolean)

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
    
    // Also update active resume if it exists
    if (user.activeResumeId) {
      const activeResume = user.resumes?.find(r => r._id?.toString() === user.activeResumeId?.toString())
      if (activeResume) {
        if (Array.isArray(skills)) activeResume.skills = skills
        if (Array.isArray(technologies)) activeResume.technologies = technologies
        await user.save()
      }
    }

    res.json({ skills: user.skills, technologies: user.technologies })
  } catch (err) {
    res.status(500).json({ message: 'Update failed' })
  }
})

// ─── GET /api/resume/:id/ats-score — get ATS score for a resume ───────────────
router.get('/:id/ats-score', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { jobDescription } = req.query // optional

    const user = await User.findById(req.user._id)
    const resume = user.resumes?.find(r => r._id?.toString() === id)
    if (!resume) return res.status(404).json({ message: 'Resume not found' })

    // Reuse cached ATS score unless jobDescription changes
    if (!jobDescription && resume.atsScore != null) {
      return res.json({
        resumeId: id,
        atsScore: resume.atsScore,
        breakdown: resume.atsBreakdown || {},
        feedback: resume.atsFeedback || [],
        strengths: resume.atsStrengths || [],
      })
    }

    const atsResult = await predictATSScore(resume.text, jobDescription || '')

    // Save on user resume for stable reload results
    const resumeIndex = user.resumes.findIndex(r => r._id?.toString() === id)
    if (resumeIndex !== -1) {
      user.resumes[resumeIndex].atsScore = atsResult.score
      user.resumes[resumeIndex].atsBreakdown = atsResult.breakdown || {}
      user.resumes[resumeIndex].atsFeedback = atsResult.feedback || []
      user.resumes[resumeIndex].atsStrengths = atsResult.strengths || []
      await user.save()
    }

    res.json({
      resumeId: id,
      atsScore: atsResult.score,
      breakdown: atsResult.breakdown,
      feedback: atsResult.feedback,
      strengths: atsResult.strengths,
    })
  } catch (err) {
    console.error('ATS score error:', err)
    res.status(500).json({ message: 'Could not calculate ATS score' })
  }
})

module.exports = router