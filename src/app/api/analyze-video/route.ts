import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ⚡ THE IN-MEMORY REQUEST CACHE ⚡
// This Map persists across requests while the server container is alive.
// It stores previous prompts to instantly return the exact same answer, saving your 15 RPM quota.
const promptCache = new Map<string, string>();

// ⚡ THE WATERFALL ENGINE ⚡
async function executeWithWaterfall(prompt: string) {
    // 1. Check the Cache First
    if (promptCache.has(prompt)) {
        console.log("⚡ [Cache Hit] Returning stored response. 0 API quota used.");
        return promptCache.get(prompt);
    }

    // 2. The Model Hierarchy (Stripped 'models/' prefix for API compatibility)
    const modelsToTry = [
        "gemini-2.5-flash",       // Primary: Smartest & Fastest
        "gemini-2.0-flash",       // Backup 1: Highly reliable, separate quota bucket
        "gemini-2.5-flash-lite",  // Backup 2: Blazing fast, lightweight
        "gemini-flash-latest",     // Backup 3: Final safety net
        "gemini-2.0-flash-lite"
    ];

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const responseText = await result.response.text();
            
            // 3. Save successful result to the Cache
            promptCache.set(prompt, responseText);
            
            return responseText;
        } catch (error: any) {
            // Intercept Rate Limit (429) or Quota errors
            if (error.status === 429 || (error.message && error.message.includes('429')) || (error.message && error.message.includes('Quota'))) {
                console.warn(`⚠️ [Waterfall] ${modelName} hit rate limit. Shifting down to next model...`);
                continue; 
            }
            // Throw catastrophic errors (like bad API keys)
            throw error; 
        }
    }
    
    // If all models in the array are exhausted
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
    Format the output in clean Markdown.
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