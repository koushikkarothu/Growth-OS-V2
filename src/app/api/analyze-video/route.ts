import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ⚡ IN-MEMORY REQUEST CACHE ⚡
const promptCache = new Map<string, string>();

// ⚡ THE WATERFALL ENGINE ⚡
// ⚡ THE WATERFALL ENGINE ⚡
async function executeWithWaterfall(prompt: string) {
    const isCacheable = prompt.length < 3000;

    // 1. Check the Cache
    if (isCacheable && promptCache.has(prompt)) {
        console.log("⚡ [Cache Hit] Returning stored response. 0 API quota used.");
        return promptCache.get(prompt);
    }

    // 2. The High-Capacity Model Hierarchy
    const modelsToTry = [
        "gemma-3-27b-it",           // The 14,000/day Infinite Text Processor
        "gemini-2.5-flash",         // Primary (Will burn out after 20/day)
        "gemini-2.0-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-lite",    // High-Capacity Reserve
        "gemma-3-12b-it",           // Secondary Infinite Processor
        "gemini-2.5-pro",
        "gemini-flash-latest"       // Ultimate Safety Net
    ];

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const responseText = await result.response.text();
            
            // 3. Save to Cache
            if (isCacheable) {
                if (promptCache.size > 200) promptCache.clear();
                promptCache.set(prompt, responseText);
            }
            
            return responseText;
        } catch (error: any) {
            // 🎯 THE ULTIMATE SHIELD: Catch Rate Limits (429), Overloads (503), AND Missing Models (404/403)
            const isBypassable = error.status === 429 || error.status === 503 || error.status === 404 || error.status === 403 || 
                (error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('404') || error.message.includes('Quota')));

            if (isBypassable) {
                console.warn(`⚠️ [Waterfall] ${modelName} failed (${error.status || 'Quota/Not Found'}). Shifting to next...`);
                continue; 
            }
            // Throw only catastrophic API Key errors
            throw error; 
        }
    }
    
    throw new Error("RATE_LIMIT_EXHAUSTED");
}

export async function POST(req: Request) {
  try {
    const { videoId, customPrompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in your environment variables." }, { status: 500 });
    }

    // --- MODE 1: AI COACH & ACTIVE RECALL (Custom Prompts) ---
    if (customPrompt && videoId === "MOCK_ID_FOR_PROMPT") {
        try {
            const analysisText = await executeWithWaterfall(customPrompt);
            return NextResponse.json({ analysis: analysisText });
        } catch (e: any) {
            if (e.message === "RATE_LIMIT_EXHAUSTED") {
                return NextResponse.json({ error: "All AI models are currently cooling down. Please wait 60 seconds." }, { status: 429 });
            }
            throw e;
        }
    }

    // --- MODE 2: LEARNING THEATER (YouTube Transcripts) ---
    let transcriptData;
    try {
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
        return NextResponse.json({ error: "YouTube blocked caption extraction, or this video has no text captions available." }, { status: 400 });
    }

    if (!transcriptData || transcriptData.length === 0) {
        return NextResponse.json({ error: "Transcript extracted, but it was empty." }, { status: 400 });
    }

    const fullText = transcriptData.map(t => t.text).join(' ').trim().substring(0, 60000); 

    if (fullText.length < 20) {
        return NextResponse.json({ error: "The extracted transcript was too short or empty to analyze." }, { status: 400 });
    }

    const prompt = `You are an expert tutor. Analyze this video transcript and provide a highly structured study guide.
    Requirements:
    1. A concise bulleted summary of the core concepts.
    2. Extract any important vocabulary, grammar rules, or technical formulas.
    3. Generate 3 "Active Recall" flashcard questions to test the user's memory.
    Format the output in clean HTML (use <b>, <ul>, <li>, <h3>, <br>). 
    CRITICAL: If you create a table, you MUST use standard HTML table tags (<table>, <tr>, <th>, <td>). Do NOT use markdown backticks or markdown headers.
    Transcript:
    """
    ${fullText}
    """`;

    try {
        const analysisText = await executeWithWaterfall(prompt);
        return NextResponse.json({ analysis: analysisText });
    } catch (e: any) {
        if (e.message === "RATE_LIMIT_EXHAUSTED") {
            return NextResponse.json({ error: "All AI models are currently cooling down. Please wait 60 seconds." }, { status: 429 });
        }
        throw e;
    }

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: 'Failed to process with AI.' }, { status: 500 });
  }
}