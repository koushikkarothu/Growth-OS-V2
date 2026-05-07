import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function executeWithWaterfall(prompt: string) {
    const modelsToTry = ["gemini-2.5-flash", "gemini-3.1-flash-lite-preview", "gemma-4-31b-it"];

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            return await result.response.text();
        } catch (error: any) {
            const isBypassable = error.status === 429 || error.status === 503 || error.status === 404;
            if (isBypassable) continue; 
            throw error; 
        }
    }
    throw new Error("RATE_LIMIT_EXHAUSTED");
}

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    if (!topic || topic.trim().length < 2) {
        return NextResponse.json({ error: "Provide a valid topic." }, { status: 400 });
    }

    const systemPrompt = `You are a master educator. The user wants to learn about: "${topic}".
    Create a highly structured, engaging "Deep Dive" mini-course.
    
    You MUST return ONLY a raw JSON object (no markdown formatting).
    {
      "title": "A captivating title for the course",
      "overview": "A brief, 2-sentence summary of what will be learned.",
      "chapters": [
        {
          "title": "Chapter 1 Title",
          "content": "Detailed, highly engaging content. Use HTML formatting like <p>, <strong>, and <ul> for readability. Do NOT use markdown.",
          "keyTakeaway": "One sentence summary."
        }
      ],
      "finalQuiz": {
        "question": "A challenging multiple-choice question.",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 1,
        "explanation": "Why this is correct."
      }
    }
    Note: Generate exactly 3 to 4 comprehensive chapters.`;

    const analysisText = await executeWithWaterfall(systemPrompt);
    const cleanJson = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json({ course: JSON.parse(cleanJson) });

  } catch (error: any) {
    console.error("Deep Dive Generation Error:", error);
    return NextResponse.json({ error: 'Failed to architect course.' }, { status: 500 });
  }
}