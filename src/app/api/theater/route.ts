import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    // 1. Fetch official video metadata from YouTube
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${url}&format=json`)
    if (!oembedRes.ok) throw new Error("Could not find video.")
    const videoData = await oembedRes.json()

    // 2. Instruct AI to extract knowledge based on the video's context
    const prompt = `
      The user just watched a YouTube video titled "${videoData.title}" by "${videoData.author_name}".
      Act as an expert tutor. Analyze this topic and generate 3 "Active Recall" flashcards to help the user remember the most important concepts from this subject.
      
      Return ONLY strictly valid JSON in this exact format:
      [
        { "topic": "Short Category (e.g. Engineering, Language, Tech)", "concept": "The Question/Concept", "details": "The Answer/Explanation" }
      ]
    `

    const result = await model.generateContent(prompt)
    let text = result.response.text()
    
    // Clean JSON formatting
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    
    return NextResponse.json({ 
      title: videoData.title, 
      author: videoData.author_name, 
      flashcards: JSON.parse(text) 
    })

  } catch (error: any) {
    console.error("Theater API Error:", error)
    return NextResponse.json({ error: "Failed to extract knowledge. Ensure it's a valid YouTube link." }, { status: 500 })
  }
}