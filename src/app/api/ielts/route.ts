import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function executeWithWaterfall(prompt: string, expectJson: boolean = true) {
    const modelsToTry = ["gemma-3-27b-it", "gemma-3-12b-it", "gemini-2.5-flash"];

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = await result.response.text();
            
            if (expectJson) {
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson);
            }
            return text;
        } catch (error: any) {
            const isBypassable = error.status === 429 || error.status === 503 || error.status === 404 || error.status === 403 || 
                (error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('404')));
            if (isBypassable) continue; 
            throw error; 
        }
    }
    throw new Error("RATE_LIMIT_EXHAUSTED");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ============================================================================
    // MODE 1: FLAWLESS PROMPT & RANDOMIZED CHART GENERATOR
    // ============================================================================
    if (body.action === "generate_prompt") {
        const { taskType } = body;
        
        const themes = ["Education", "Technology", "Healthcare", "Environment", "Crime", "Economy", "Globalization", "Public Transport", "Society", "Space Exploration", "History", "Workplace"];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        
        let promptGenerator = "";
        if (taskType === 'Task 1 (Academic)') {
            // 🎯 THE FIX: Force the AI to use a randomly selected chart type every time
            const chartTypes = ["bar", "line", "pie", "doughnut"];
            const randomChart = chartTypes[Math.floor(Math.random() * chartTypes.length)];

            promptGenerator = `You are a Cambridge IELTS Exam Creator. Generate an authentic, difficult IELTS Academic Task 1 past-paper question about ${randomTheme}. 
            You MUST return a JSON object with two keys: "text" and "chartConfig".
            1. "text": The exact essay prompt.
            2. "chartConfig": A VALID JSON object representing a Chart.js configuration. 
            CRITICAL: You MUST use the chart type: '${randomChart}'. Do NOT use any other chart type.
            Example config structure: {"type": "${randomChart}", "data": {"labels": ["2010", "2020"], "datasets": [{"label": "Group A", "data": [50, 60]}]}}`;
        } else {
            promptGenerator = `You are a Cambridge IELTS Exam Creator. Generate an authentic, difficult IELTS Task 2 essay question about ${randomTheme} (e.g., Discuss both views, To what extent do you agree).
            You MUST return a JSON object with two keys: "text" (the prompt) and "chartConfig" (null).`;
        }

        const generatedData = await executeWithWaterfall(promptGenerator, true);
        
        let imageUrl = null;
        if (generatedData.chartConfig) {
            imageUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(generatedData.chartConfig))}`;
        }

        return NextResponse.json({ prompt: { text: generatedData.text, image: imageUrl } });
    }

    // ============================================================================
    // MODE 2: THE OBJECTIVE CAMBRIDGE GRADER (ANTI-ANCHORING PROTOCOL)
    // ============================================================================
    const { taskType, prompt, essay, wordCount } = body;

    if (!essay || essay.trim().length < 20) {
        return NextResponse.json({ error: "Your response is too short to analyze." }, { status: 400 });
    }

    const targetWords = taskType === 'Task 1 (Academic)' ? 150 : 250;

    const gradingPrompt = `You are an official, highly objective Cambridge IELTS Examiner. Grade this candidate's ${taskType} essay using the official public band descriptors.
    The Essay Prompt was: "${prompt}"
    The Candidate's Essay is: "${essay}"
    Candidate Word Count: ${wordCount} words. Target Minimum: ${targetWords} words.

    CRITICAL RULES:
    1. YOU MUST CALCULATE THE ACTUAL SCORE based on the essay's merit. DO NOT copy the placeholder values in the JSON template. 
    2. BE ACCURATE: Reward C1/C2 vocabulary and complex grammar appropriately. Give 8.5 or 9.0 if the writing is exceptional.
    3. PENALTY: Severely penalize only if the word count is significantly below the target (${targetWords}).
    4. You MUST separate paragraphs in your "fullRewrite" using EXACTLY the characters "\\n\\n".
    
    You MUST return ONLY a raw JSON object. Replace the bracketed placeholders with your calculated data:
    {
      "overallBand": <calculated float between 0.0 and 9.0>,
      "taskResponse": { "score": <calculated float>, "feedback": "<objective explanation>" },
      "coherence": { "score": <calculated float>, "feedback": "<objective explanation>" },
      "lexical": { "score": <calculated float>, "feedback": "<objective explanation>" },
      "grammatical": { "score": <calculated float>, "feedback": "<objective explanation>" },
      "weakestLink": {
        "originalSentence": "<the actual weakest sentence from the candidate's essay>",
        "rewrite": "<your Band 9 improved version>",
        "explanation": "<why it is better>"
      },
      "vocabularyUpgrades": [
        { "basic": "<basic word>", "advanced": "<advanced word>", "context": "<how to use it>" }
      ],
      "fullRewrite": "<Paragraph 1>\\n\\n<Paragraph 2>\\n\\n<Paragraph 3>"
    }`;

    const parsedData = await executeWithWaterfall(gradingPrompt, true);
    return NextResponse.json({ analysis: parsedData });

  } catch (error: any) {
    console.error("IELTS Analysis Error:", error);
    return NextResponse.json({ error: 'Failed to process with AI Examiner.' }, { status: 500 });
  }
}