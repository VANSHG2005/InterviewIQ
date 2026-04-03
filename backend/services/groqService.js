const Groq = require('groq-sdk')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'llama-3.3-70b-versatile'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function chat(messages, { temperature = 0.7, maxTokens = 1024 } = {}) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  })
  return response.choices[0]?.message?.content?.trim() || ''
}

function parseJSON(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

// ─── Resume Analysis ──────────────────────────────────────────────────────────

async function analyzeResume(resumeText) {
  const prompt = `You are an expert technical recruiter. Extract structured information from this resume.

Resume:
"""
${resumeText.slice(0, 6000)}
"""

Return ONLY valid JSON (no markdown, no explanation):
{
  "skills": ["skill1", "skill2"],
  "technologies": ["tech1", "tech2"],
  "education": [{"institution": "", "degree": "", "field": "", "year": ""}],
  "projects": [{"name": "", "description": "", "technologies": []}],
  "experience": [{"company": "", "role": "", "duration": "", "description": ""}],
  "seniorityLevel": "junior|mid|senior",
  "primaryDomain": "frontend|backend|fullstack|data|devops|mobile|other"
}`

  const text = await chat([{ role: 'user', content: prompt }], { temperature: 0.2 })
  try { return parseJSON(text) } catch { return {} }
}

// ─── Generate First Question ──────────────────────────────────────────────────

async function generateFirstQuestion(interview, user) {
  const resumeSummary = buildResumeSummary(user)
  const persona = getPersona(interview.type, interview.company)

  const systemPrompt = `${persona}

Candidate profile:
${resumeSummary}

Interview type: ${interview.type}${interview.company ? ` (${interview.company}-style)` : ''}
Difficulty: ${interview.difficulty || 'mid'}

Rules:
- Ask ONE question at a time
- Start with a warm, professional opener
- Base the question on the candidate's actual background
- For technical interviews: begin with a moderate difficulty question
- For behavioral: use a STAR-method prompt
- Do NOT ask for self-introduction — dive into a real question
- Keep the question under 4 sentences`

  const text = await chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Ask me the first interview question.' },
  ], { temperature: 0.8 })

  return text
}

// ─── Generate Follow-up / Next Question ──────────────────────────────────────

async function generateNextQuestion(interview, user, previousQAs, questionNumber) {
  const resumeSummary = buildResumeSummary(user)
  const persona = getPersona(interview.type, interview.company)
  const totalQuestions = 8

  // Build conversation history
  const history = previousQAs.map((qa, i) => [
    { role: 'assistant', content: qa.question },
    { role: 'user', content: qa.answer },
  ]).flat()

  // Adaptive difficulty
  const recentScores = previousQAs.slice(-2).map(qa => qa.quickScore || 5)
  const avgScore = recentScores.length
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    : 5
  const difficultyNote = avgScore >= 7.5
    ? 'The candidate is performing well — increase difficulty slightly.'
    : avgScore <= 4
    ? 'The candidate is struggling — adjust to a slightly easier angle or topic.'
    : 'Maintain current difficulty.'

  const systemPrompt = `${persona}

Candidate profile:
${resumeSummary}

Interview type: ${interview.type}
Question ${questionNumber} of ${totalQuestions}. ${difficultyNote}

Rules:
- Ask ONE question only
- Build on the conversation — probe deeper on weak spots, explore new topics if doing well
- If the last answer was vague, ask a targeted follow-up
- Vary between topics — don't repeat subjects from recent questions
- Be direct and professional
- Keep question under 4 sentences`

  const text = await chat([
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: 'Ask the next interview question.' },
  ], { temperature: 0.75 })

  return text
}

// ─── Quick Score (for adaptive difficulty) ───────────────────────────────────

async function quickScoreAnswer(question, answer) {
  const prompt = `Rate this interview answer on a scale of 1-10 for each: clarity, depth, confidence, relevance. 
Respond ONLY with a JSON object.

Question: ${question}
Answer: ${answer.slice(0, 1000)}

JSON format: {"clarity": 7, "depth": 6, "confidence": 8, "relevance": 7}`

  const text = await chat([{ role: 'user', content: prompt }], { temperature: 0.1, maxTokens: 100 })
  try {
    const match = text.match(/\{.*\}/s)
    if (match) {
      return JSON.parse(match[0])
    }
    return { clarity: 5, depth: 5, confidence: 5, relevance: 5 }
  } catch (err) {
    console.error('Quick score parse error:', err)
    return { clarity: 5, depth: 5, confidence: 5, relevance: 5 }
  }
}

// ─── Brief In-Interview Feedback ─────────────────────────────────────────────

async function generateBriefFeedback(question, answer, questionNumber, total) {
  // Only give brief acknowledgment mid-interview, not full evaluation
  if (questionNumber >= total - 1) return null  // silent on last question

  const prompt = `You are a professional interviewer. The candidate just answered a question.
Give a brief 1-sentence acknowledgment (not full evaluation) that sounds natural — like a real interviewer.
Examples: "Good, that covers the basics." / "Interesting approach." / "Let's build on that."
Do NOT give scores or detailed feedback yet.

Question: ${question}
Answer: ${answer.slice(0, 400)}

One-sentence acknowledgment:`

  const text = await chat([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 60 })
  return text
}

// ─── Full Evaluation ──────────────────────────────────────────────────────────

async function evaluateInterview(interview, user, questionsAndAnswers) {
  const resumeSummary = buildResumeSummary(user)

  const qaPairs = questionsAndAnswers.map((qa, i) =>
    `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`
  ).join('\n\n')

  const prompt = `You are a senior hiring manager evaluating a ${interview.type} interview.

Candidate background:
${resumeSummary}

Interview transcript:
${qaPairs}

Evaluate thoroughly and return ONLY valid JSON:
{
  "scores": {
    "technical": <0-10>,
    "communication": <0-10>,
    "confidence": <0-10>,
    "depth": <0-10>,
    "problemSolving": <0-10>
  },
  "aiSummary": "<2-3 sentence honest overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "questionBreakdown": [
    {
      "question": "<question text>",
      "answer": "<answer text>",
      "score": <0-10>,
      "feedback": "<2 sentence specific feedback>",
      "idealAnswer": "<what a strong answer would have included>"
    }
  ],
  "weakTopics": [
    { "topic": "<topic name>", "description": "<why it's weak>", "severity": "high|medium|low" }
  ],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>"],
  "roadmap": [
    {
      "week": 1,
      "title": "<focus topic>",
      "description": "<what to study and why>",
      "resources": ["<resource 1>", "<resource 2>"],
      "topics": ["<specific topic>"]
    }
  ]
}`

  const text = await chat([{ role: 'user', content: prompt }], {
    temperature: 0.3,
    maxTokens: 3000,
  })

  try {
    return parseJSON(text)
  } catch (err) {
    console.error('Failed to parse evaluation JSON:', err.message)
    // Return a fallback structure
    return {
      scores: { technical: 6, communication: 6, confidence: 6, depth: 6, problemSolving: 6 },
      aiSummary: 'Interview evaluation is being processed.',
      strengths: [],
      questionBreakdown: [],
      weakTopics: [],
      suggestions: [],
      roadmap: [],
    }
  }
}

// ─── Resume-based question bank ───────────────────────────────────────────────

async function generateResumeQuestions(user) {
  const resumeSummary = buildResumeSummary(user)

  const prompt = `Generate 5 technical interview questions tailored to this candidate's resume.

Profile:
${resumeSummary}

Return ONLY valid JSON array:
[
  { "text": "<question>", "category": "technical", "difficulty": <1-10> }
]`

  const text = await chat([{ role: 'user', content: prompt }], { temperature: 0.7 })
  try { return parseJSON(text) } catch { return [] }
}

// ─── ATS Score Prediction ─────────────────────────────────────────────────────

async function predictATSScore(resumeText, jobDescription = '') {
  const prompt = `You are an ATS (Applicant Tracking System) expert. Evaluate this resume for ATS compatibility and predict a score out of 100.

Resume:
"""
${resumeText.slice(0, 6000)}
"""

${jobDescription ? `Job Description:
"""
${jobDescription.slice(0, 3000)}
"""` : ''}

Evaluate based on:
- Keyword optimization (matches job keywords if provided)
- Format and structure (clear sections, readable fonts implied)
- Quantifiable achievements (numbers, metrics)
- Length and completeness
- Skills and experience clarity
- ATS-friendly elements (no graphics, standard fonts, etc.)

Return ONLY valid JSON:
{
  "score": <0-100>,
  "breakdown": {
    "keywordMatch": <0-100>,
    "format": <0-100>,
    "achievements": <0-100>,
    "completeness": <0-100>,
    "skillsClarity": <0-100>
  },
  "feedback": ["<improvement suggestion 1>", "<improvement suggestion 2>"],
  "strengths": ["<strength 1>", "<strength 2>"]
}`

  const text = await chat([{ role: 'user', content: prompt }], { temperature: 0.2 })
  try { return parseJSON(text) } catch { return { score: 50, breakdown: {}, feedback: [], strengths: [] } }
}

// ─── Speech Transcription ─────────────────────────────────────────────────────

async function transcribeAudio(audioBuffer) {
  // Groq Whisper API
  const response = await groq.audio.transcriptions.create({
    file: audioBuffer,
    model: 'whisper-large-v3',
    response_format: 'json',
  })
  return response.text || ''
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildResumeSummary(user) {
  const parts = []
  if (user.skills?.length) parts.push(`Skills: ${user.skills.slice(0, 12).join(', ')}`)
  if (user.technologies?.length) parts.push(`Technologies: ${user.technologies.slice(0, 10).join(', ')}`)
  if (user.experience?.length) {
    const exp = user.experience.slice(0, 2).map(e => `${e.role} at ${e.company}`).join('; ')
    parts.push(`Experience: ${exp}`)
  }
  if (user.education?.length) {
    const edu = user.education[0]
    if (edu?.degree) parts.push(`Education: ${edu.degree} in ${edu.field || 'CS'} from ${edu.institution}`)
  }
  if (user.projects?.length) {
    const proj = user.projects.slice(0, 2).map(p => p.name).join(', ')
    parts.push(`Projects: ${proj}`)
  }
  return parts.length ? parts.join('\n') : 'No resume on file — conduct a general interview.'
}

function getPersona(type, company) {
  const personas = {
    technical: `You are a senior software engineer with 10+ years of experience conducting technical interviews.
You ask precise, challenging questions about algorithms, system design, and coding practices.
You probe deeper when answers are vague and acknowledge strong answers briefly.`,

    behavioral: `You are a principal engineer and hiring manager conducting a behavioral interview.
You use the STAR method, ask about past experiences, leadership, conflict resolution, and teamwork.
You look for specific examples, not hypothetical answers.`,

    hr: `You are a senior HR manager conducting a screening interview.
You ask about career goals, compensation expectations, culture fit, and work style.
You are professional, warm, and thorough.`,

    company: company ? `You are a ${company} interviewer conducting a ${company}-style interview.
${company === 'Google' ? 'You focus on coding, system design, and Googleyness (ambiguity handling, leadership).' : ''}
${company === 'Amazon' ? 'You follow Amazons Leadership Principles closely, asking for specific behavioral examples.' : ''}
${company === 'Meta' ? 'You emphasize product thinking, scale, and full-stack engineering depth.' : ''}
${company === 'Apple' ? 'You focus on product quality, attention to detail, and technical depth.' : ''}
${company === 'Microsoft' ? 'You balance technical skill with collaboration and growth mindset.' : ''}
You maintain ${company} interview standards throughout.` : `You are a senior technical interviewer.`,
  }

  return personas[type] || personas.technical
}

module.exports = {
  analyzeResume,
  generateFirstQuestion,
  generateNextQuestion,
  quickScoreAnswer,
  generateBriefFeedback,
  evaluateInterview,
  generateResumeQuestions,
  transcribeAudio,
  predictATSScore,
}
