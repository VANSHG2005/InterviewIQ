const express = require('express')
const multer = require('multer')
const Groq = require('groq-sdk')
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js')
const auth = require('../middleware/auth')

const router = express.Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB audio
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(webm|mp3|wav|m4a|ogg)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Audio files only'))
    }
  },
})

// ─── POST /api/speech/transcribe ──────────────────────────────────────────────
router.post('/transcribe', auth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No audio file uploaded' })

    // Groq Whisper needs a File-like object
    const audioFile = new File([req.file.buffer], req.file.originalname || 'audio.webm', {
      type: req.file.mimetype || 'audio/webm',
    })

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
    })

    res.json({ text: transcription.text || '' })
  } catch (err) {
    console.error('Transcription error:', err)
    res.status(500).json({ message: 'Transcription failed', text: '' })
  }
})

// ─── POST /api/speech/tts ─────────────────────────────────────────────────────
router.post('/tts', auth, async (req, res) => {
  try {
    const { text, voiceId = 'JBFqnCBsd6RMkjVDRZzb' } = req.body // Rachel professional voice
    if (!text) return res.status(400).json({ message: 'Text is required' })

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ message: 'ElevenLabs API key not configured' })
    }

    const audioStream = await elevenlabs.textToSpeech.stream(
      voiceId,
      {
        text,
        modelId: 'eleven_v3',
      }
    )

    res.setHeader('Content-Type', 'audio/mpeg')

    for await (const chunk of audioStream) {
      res.write(chunk)
    }

    res.end()
  } catch (err) {
    console.error('TTS error:', err)
    res.status(500).json({ message: err.message || 'Error generating audio' })
  }
})

module.exports = router
