import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

// Ensure API Key exists
const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error("❌ ERROR: GEMINI_API_KEY is missing in .env.local")
}

const genAI = new GoogleGenerativeAI(apiKey || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }) //gemini-2.5-pro

export async function POST(req: Request) {
  try {
    const { action, domain, currentConcept, userQuestion } = await req.json()
    console.log(`🤖 AI Request Received: ${action} for ${domain}`)

    // SCENARIO 1: NEW DAILY CONCEPT
    if (action === 'generate') {
      const prompt = `
        Teach me a new, fascinating concept about "${domain}".
        It should be complex enough to be interesting but explained clearly.
        
        Return a valid JSON object strictly in this format (no markdown):
        {
          "topic": "The Name of the Concept",
          "hook": "A short, catchy one-sentence summary.",
          "content": "A detailed 2-paragraph explanation.",
          "importance": "Why this matters in the real world."
        }
      `
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim()
      
      console.log("✅ AI Response Success")
      return NextResponse.json(JSON.parse(text))
    }

    // SCENARIO 2: DEEP DIVE (Follow-up)
    if (action === 'explain_more') {
      const prompt = `
        I am learning about "${currentConcept.topic}".
        The user asked: "${userQuestion}"
        
        Provide a specific, clear answer to clarify this detail. Keep it under 150 words.
      `
      const result = await model.generateContent(prompt)
      return NextResponse.json({ answer: result.response.text() })
    }

    // SCENARIO 3: QUIZ TIME
    if (action === 'quiz') {
      const prompt = `
        Based on the topic "${currentConcept.topic}", generate 3 multiple-choice questions.
        Return valid JSON array: 
        [
          {"q": "Question text?", "options": ["A", "B", "C"], "correct": 0} // correct is index
        ]
      `
      const result = await model.generateContent(prompt)
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
      return NextResponse.json(JSON.parse(text))
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error("🔥 AI GENERATION FAILED:", error.message)
    // Return the actual error message so the frontend can see it
    return NextResponse.json({ error: error.message || 'AI failed to respond' }, { status: 500 })
  }
}