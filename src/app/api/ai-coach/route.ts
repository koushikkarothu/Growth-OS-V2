import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// USE 'gemini-1.5-flash' for the best free-tier limits (15 requests/min)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function POST(req: Request) {
  try {
    const { mode, input, context, history } = await req.json()

    if (mode === 'syntax_check') {
      const prompt = `
        The user wrote: "${input}" trying to use the word "${context}".
        Analyze grammar. Return strictly valid JSON with no markdown:
        { 
          "correct": boolean, 
          "feedback": "short explanation and a example sentence with more effective usage of the word", 
          "improved": "the corrected sentence" 
        }
      `
      const result = await model.generateContent(prompt)
      const text = cleanText(result.response.text())
      return NextResponse.json(JSON.parse(text))
    }

    if (mode === 'conversation') {
      const systemInstruction = {
        role: 'user',
        parts: [{ text: "You are a casual English coach. Converse like a friend. Keep answers short (max 2 sentences). No markdown symbols." }]
      }
      const chat = model.startChat({ history: [systemInstruction, ...history] })
      const result = await chat.sendMessage(input)
      const text = cleanText(result.response.text())
      return NextResponse.json({ reply: text })
    }

    if (mode === 'analyze_conversation') {
      const prompt = `
        Analyze this conversation: ${JSON.stringify(history)}.
        Return strictly valid JSON:
        { "score": "A/B/C", "strengths and user's pronounication check": ["point1"], "weaknesses and user's grammar check": ["point1"], "tips": "advice" }
      `
      const result = await model.generateContent(prompt)
      const text = cleanText(result.response.text())
      return NextResponse.json(JSON.parse(text))
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })

  } catch (error: any) {
    console.error("AI Error:", error)
    
    // Check for Rate Limit Error (429)
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota')) {
        return NextResponse.json(
            { error: "You are speaking too fast! The AI needs a moment to cool down. Please wait 30 seconds." }, 
            { status: 429 }
        )
    }

    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
  }
}

// Helper to clean Markdown from AI response
function cleanText(text: string) {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/\*/g, '') // Remove asterisks
    .replace(/#/g, '')  // Remove hashes
    .trim()
}