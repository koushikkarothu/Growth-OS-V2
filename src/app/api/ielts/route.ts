import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

async function executeWithWaterfall(prompt: string, expectJson: boolean = true) {
    const modelsToTry = ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-2.5-flash"];

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
            const result = await model.generateContent(prompt);
            const text = await result.response.text();
            
            if (expectJson) {
                const match = text.match(/\{[\s\S]*\}/);
                if (match) return JSON.parse(match[0]);
                return JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
            }
            return text;
        } catch (error: any) {
            const isBypassable = error.status === 429 || error.status === 503 || error.status === 404 || error.status === 403 || error.status === 400;
            if (isBypassable) continue; 
            throw error; 
        }
    }
    throw new Error("RATE_LIMIT_EXHAUSTED_OR_API_ERROR");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ============================================================================
    // MODE 1: AUTHENTIC PDF-STYLE PROMPT GENERATOR
    // ============================================================================
    if (body.action === "generate_prompt") {
        const { taskType } = body;
        
        // Themes directly extracted from recent IELTS papers
        const themes = ["City Populations and Housing", "Internet News Reliability", "Retirement Homes vs Family Care", "Celebrity Role Models for Youth", "Expensive Sports/Cultural Tickets", "Recycling and Waste Management", "Teenage Crime Rates", "Computer Games and Children", "Online Shopping Trends"];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        
        let promptGenerator = "";
        if (taskType === 'Task 1 (Academic)') {
            const chartTypes = ["bar", "line", "pie"];
            const randomChart = chartTypes[Math.floor(Math.random() * chartTypes.length)];
            promptGenerator = `Generate a standard IELTS Academic Task 1 question about ${randomTheme}. 
            The text MUST be exactly 1 to 2 sentences long.
            Return a JSON object: {"text": "<Prompt>", "chartConfig": <Valid Chart.js Config for type '${randomChart}'>}`;
        } else {
            // 🎯 THE FIX: Hardcoding the exact question structures from your PDF
            const structures = [
                "To what extent do you agree or disagree?",
                "Is this a positive or negative development?",
                "What are the reasons for this? Is it a positive or negative trend?",
                "What are the causes of this problem and what can be done to solve it?",
                "Discuss both these views and give your own opinion.",
                "Why do you think this is the case? Is it a positive or negative development?"
            ];
            const randomStructure = structures[Math.floor(Math.random() * structures.length)];

            promptGenerator = `Generate a highly authentic, exact replica of a Cambridge IELTS Task 2 essay question about ${randomTheme}.
            CRITICAL RULES:
            1. Sentence 1: A brief context statement stating a fact or trend about the topic.
            2. Sentence 2 MUST BE EXACTLY this phrase, word-for-word: "${randomStructure}"
            3. Do NOT include ANY extra instructions, tips, or paragraphing. Just the 2 sentences.
            
            Return a JSON object: {"text": "<The 2-sentence prompt>", "chartConfig": null}`;
        }

        const generatedData = await executeWithWaterfall(promptGenerator, true);
        let imageUrl = null;
        if (generatedData.chartConfig) imageUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(generatedData.chartConfig))}`;

        return NextResponse.json({ prompt: { text: generatedData.text, image: imageUrl } });
    }

    // ============================================================================
    // MODE 2: THE BRAINSTORM ENGINE (New Feature from Video)
    // ============================================================================
    if (body.action === "brainstorm") {
        const brainstormPrompt = `The user is writing an IELTS Task 2 essay based on this prompt: "${body.prompt}"
        Generate a highly structured, bulleted list of ideas to help them brainstorm.
        Provide 2 excellent arguments/points for ONE side (or causes), and 2 excellent arguments for the OTHER side (or solutions).
        Include 2-3 C1/C2 level vocabulary words they should try to use.
        
        Return ONLY a JSON object:
        { "htmlContent": "<HTML formatted content using <ul>, <li>, and <strong>. Keep it extremely concise and easy to read.>" }`;

        const parsedData = await executeWithWaterfall(brainstormPrompt, true);
        return NextResponse.json({ brainstorm: parsedData });
    }

    // ============================================================================
    // MODE 3: THE OBJECTIVE CAMBRIDGE GRADER
    // ============================================================================
    const { taskType, prompt, essay, wordCount } = body;
    if (!essay || essay.trim().length < 20) return NextResponse.json({ error: "Response too short." }, { status: 400 });

    const targetWords = taskType === 'Task 1 (Academic)' ? 150 : 250;
    const gradingPrompt = `Grade this candidate's ${taskType} essay using IELTS band descriptors.
    Prompt: "${prompt}"
    Essay: "${essay}"

    Return JSON:
    {
      "overallBand": <float 0-9>,
      "taskResponse": { "score": <float>, "feedback": "<explanation>" },
      "coherence": { "score": <float>, "feedback": "<explanation>" },
      "lexical": { "score": <float>, "feedback": "<explanation>" },
      "grammatical": { "score": <float>, "feedback": "<explanation>" },
      "weakestLink": { "originalSentence": "<sentence>", "rewrite": "<Band 9 version>", "explanation": "<why>" },
      "vocabularyUpgrades": [ { "basic": "<word>", "advanced": "<C1/C2 word>", "context": "<usage>" } ],
      "fullRewrite": "<Paragraph 1>\\n\\n<Paragraph 2>\\n\\n<Paragraph 3>"
    }`;

    const parsedData = await executeWithWaterfall(gradingPrompt, true);
    return NextResponse.json({ analysis: parsedData });

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to process AI request.' }, { status: 500 });
  }
}