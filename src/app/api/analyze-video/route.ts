import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in your environment variables." }, { status: 500 });
    }

    // 1. Fetch the Transcript
    let transcriptData;
    try {
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
        return NextResponse.json({ error: "YouTube blocked caption extraction, or this video has no text captions available." }, { status: 400 });
    }

    // 2. THE INTERCEPTOR: Validate the Data
    if (!transcriptData || transcriptData.length === 0) {
        return NextResponse.json({ error: "Transcript extracted, but it was empty. YouTube is hiding the captions for this specific video." }, { status: 400 });
    }

    const fullText = transcriptData.map(t => t.text).join(' ').trim().substring(0, 60000); 

    // Prevent Gemini from hallucinating on empty or tiny text (e.g. if the transcript just says "[Music]")
    if (fullText.length < 20) {
        return NextResponse.json({ error: "The extracted transcript was too short or empty to analyze." }, { status: 400 });
    }

    // 3. Feed it to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    
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

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return NextResponse.json({ analysis: response.text() });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: 'Failed to process video with AI.' }, { status: 500 });
  }
}