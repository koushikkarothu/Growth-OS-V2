import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { prompt, expectJson } = await req.json();

    if (!prompt) {
        return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Using your infinite reserve Gemma or standard Gemini Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    if (expectJson) {
        // Clean markdown blocks if the AI added them
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return NextResponse.json({ result: JSON.parse(cleanJson) });
    }

    return NextResponse.json({ result: text.trim() });

  } catch (error: any) {
    console.error("AI Tutor Error:", error);
    return NextResponse.json({ error: "Neural link failed" }, { status: 500 });
  }
}