import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: request.model,
    systemInstruction: request.systemPrompt,
  });

  const generationConfig = {
    temperature: request.temperature ?? 0.7,
    maxOutputTokens: request.maxTokens ?? 8192,
  };

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
    generationConfig,
  });

  const response = result.response;
  const text = response.text();

  return {
    content: text,
    model: request.model,
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    },
  };
}
