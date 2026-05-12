import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function executeWithWaterfall(prompt: string, expectJson: boolean = true) {
    const modelsToTry = ["gemini-2.5-flash", "gemini-3.1-flash-lite-preview", "gemma-4-26b-a4b-it", "gemma-4-31b-it"];

    for (const modelName of modelsToTry) {
        try {
            const modelConfig: any = { model: modelName };
            if (modelName.includes('gemini')) {
                modelConfig.tools = [{ googleSearch: {} }];
            }
            
            const model = genAI.getGenerativeModel(modelConfig);
            const result = await model.generateContent(prompt);
            const text = await result.response.text();
            
            if (expectJson) {
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').replace(/\*\*/g, '').trim();
                return JSON.parse(cleanJson);
            }
            return text.replace(/\*\*/g, '').trim();
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
    const body = await req.json();

    // 🎯 1. EPHEMERAL DAILY BRIEFING
    if (body.action === 'fetch_briefing') {
        const todayDate = new Date().toDateString();
        
        const prompt = `You are a Chief Intelligence Officer providing a high-stakes daily briefing. 
        TODAY'S DATE IS: ${todayDate}. SEARCH THE WEB for the absolute latest, breaking news from today.
        
        Analytical Style:
        - Use the investigative depth of 'The Economist' for global affairs.
        - Apply the policy-centric, rigorous tone of 'The Hindu' for Indian national news.
        - Incorporate the hyper-local, infrastructure-focused lens of 'Eenadu/TOI' for South Indian regional updates (Telangana/AP).
        - Use a 'MIT Tech Review' style for innovations.

        Return ONLY a raw JSON object. 
        Generate exactly 2 distinct, highly important news briefings for EACH of the following 9 categories:
        'Indian Governance', 'Global Geopolitics', 'Tech, Physical AI & Innovation', 'Macroeconomics', 'MedTech & BioEng', 'Regional (Telangana/AP)', 'Climate Risk', 'Sports & Athletics', 'Wildcard'.
        
        Format strictly:
        {
          "briefings": [
            {
              "category": "Category Name Here",
              "headline": "A specific, accurate current event headline",
              "summary": "3-sentence dense synthesis of the event. NO markdown asterisks.",
              "tags": ["Tag1", "Tag2", "Tag3"]
            }
          ]
        }`;

        const data = await executeWithWaterfall(prompt, true);
        return NextResponse.json({ data: data.briefings });
    }

    // 🎯 2. DYNAMIC DEEP DIVE (Adapts to Context)
    if (body.action === 'deep_dive') {
        const prompt = `SEARCH THE WEB. Perform a rigorous deep dive on this current event: "${body.headline}".
        Break down the complexity. CRITICAL: Adapt your analytical framework to the specific topic (e.g., a sports event requires different analysis than a geopolitical war or a corporate merger). Do not use markdown asterisks.
        
        Return ONLY a raw JSON object formatted strictly:
        {
          "sections": [
            {
              "heading": "Contextually relevant heading (e.g., 'The Root Cause', 'Match Turning Point', 'Market Impact')",
              "content": "Detailed expert analysis paragraph.",
              "icon": "Choose one depending on context: 'history', 'users', 'alert', 'trending', 'zap', 'target'"
            }
          ]
        }
        Generate exactly 4 insightful sections.`;

        const data = await executeWithWaterfall(prompt, true);
        return NextResponse.json({ data });
    }

    // 🎯 3. INTERROGATION ROOM
    if (body.action === 'interrogate') {
        const prompt = `SEARCH THE WEB. Context Event: "${body.headline}". Event Details: ${JSON.stringify(body.context)}
        User Question: "${body.question}"
        Provide an intelligent, direct, factual answer. Do not use markdown asterisks.`;
        const data = await executeWithWaterfall(prompt, false);
        return NextResponse.json({ answer: data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to access Intelligence Network.' }, { status: 500 });
  }
}