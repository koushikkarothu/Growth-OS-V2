import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 🎯 THE FIX: The highly resilient Waterfall execution engine
async function executeWithWaterfall(prompt: string, expectJson: boolean = false) {
    // 🎯 Using your verified, authorized model strings
    const modelsToTry = [
        "gemini-2.5-flash", 
        "gemini-3.1-flash-lite-preview", 
        "gemma-4-31b-it", 
        "gemini-flash-latest"
    ];

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = await result.response.text();
            
            if (expectJson) {
                // Strip markdown wrappers if the AI hallucinates them
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson);
            }
            return text.trim();
        } catch (error: any) {
            // If the error is a rate limit (429), server overload (503), or wrong model (404), fail over.
            const isBypassable = error.status === 429 || error.status === 503 || error.status === 404;
            if (isBypassable) {
                console.warn(`⚠️ [AI Tutor] ${modelName} failed. Falling back to the next neural link...`);
                continue; 
            }
            throw error; // Throw real code bugs back to the client
        }
    }
    throw new Error("RATE_LIMIT_EXHAUSTED");
}

export async function POST(req: Request) {
  try {
    const { prompt, expectJson } = await req.json();

    if (!prompt) {
        return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Execute the prompt through the waterfall engine
    const result = await executeWithWaterfall(prompt, expectJson);

    // Return the successfully parsed JSON or plain text string
    return NextResponse.json({ result });

  } catch (error: any) {
    console.error("AI Tutor Error:", error);
    return NextResponse.json({ error: "Neural link failed" }, { status: 500 });
  }
}