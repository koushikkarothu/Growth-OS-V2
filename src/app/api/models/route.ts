import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured in your environment." }, { status: 400 });
    }

    // Ping the official Google Generative Language REST endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
        throw new Error(`Google API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Clean up the data to make it easily readable for you
    const readableModels = data.models.map((model: any) => ({
      modelId: model.name.replace('models/', ''), // The exact string you need to use in your code
      displayName: model.displayName,
      description: model.description,
      supportedMethods: model.supportedGenerationMethods,
      inputTokenLimit: model.inputTokenLimit,
      outputTokenLimit: model.outputTokenLimit
    }));

    return NextResponse.json({ 
        totalModels: readableModels.length,
        models: readableModels 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Model Scanner Error:", error);
    return NextResponse.json({ error: "Failed to scan Google API endpoints." }, { status: 500 });
  }
}