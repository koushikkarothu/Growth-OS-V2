import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export async function POST(req: Request) {
  try {
    const { mode, input, context, history } = await req.json()

    if (mode === 'syntax_check') {
      // 1. Force strict JSON response for Syntax
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
      let text = result.response.text()
      // Cleanup cleanup
      text = text.replace(/```json/g, '').replace(/```/g, '').trim()
      return NextResponse.json(JSON.parse(text))
    }

    if (mode === 'conversation') {
      // 2. Conversation Logic (No changes needed if you used previous step, but included for completeness)
      const systemInstruction = {
        role: 'user',
        parts: [{ text: "You are a casual English coach. Converse like a friend. Keep answers short (max 2 sentences). No markdown symbols." }]
      }
      const chat = model.startChat({ history: [systemInstruction, ...history] })
      const result = await chat.sendMessage(input)
      let cleanText = result.response.text().replace(/\*/g, '').replace(/#/g, '').trim()
      return NextResponse.json({ reply: cleanText })
    }

    if (mode === 'analyze_conversation') {
      const prompt = `
        Analyze this conversation: ${JSON.stringify(history)}.
        Return strictly valid JSON:
        { "score": "A/B/C", "strengths and user's pronounication check": ["point1"], "weaknesses and user's grammar check": ["point1"], "tips": "advice" }
      `
      const result = await model.generateContent(prompt)
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
      return NextResponse.json(JSON.parse(text))
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (error: any) {
    console.error("AI Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}