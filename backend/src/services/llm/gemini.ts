import { GoogleGenAI } from '@google/genai';
import type { ToolDefinition, ToolCall } from './tools';

export interface GeminiRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required';
  useGoogleSearch?: boolean; // Enable native Google Search grounding
}

export interface GeminiResponse {
  content: string;
  model: string;
  toolCalls?: ToolCall[];
  searchQueries?: string[]; // Google Search queries executed
  groundingMetadata?: any;   // Grounding sources and citations
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

  const ai = new GoogleGenAI({ apiKey });

  // Build tools array
  const tools: any[] = [];

  // Add Google Search grounding if enabled
  if (request.useGoogleSearch) {
    tools.push({ googleSearch: {} });
  }

  // Add custom function declarations if provided
  if (request.tools && request.tools.length > 0) {
    tools.push({
      functionDeclarations: request.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'OBJECT',
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        },
      })),
    });
  }

  // Build config
  const config: any = {};

  if (tools.length > 0) {
    config.tools = tools;
  }

  if (request.systemPrompt) {
    config.systemInstruction = request.systemPrompt;
  }

  if (request.temperature !== undefined || request.maxTokens !== undefined) {
    config.generationConfig = {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 8192,
    };
  }

  // Tool config for function calling
  if (request.toolChoice && request.tools && request.tools.length > 0) {
    if (request.toolChoice === 'required') {
      config.toolConfig = { functionCallingConfig: { mode: 'ANY' } };
    } else if (request.toolChoice === 'none') {
      config.toolConfig = { functionCallingConfig: { mode: 'NONE' } };
    } // 'auto' is default
  }

  // Generate content
  const response = await ai.models.generateContent({
    model: request.model,
    contents: request.userPrompt,
    config,
  });

  // Extract text and tool calls
  let text = '';
  const toolCalls: ToolCall[] = [];
  let searchQueries: string[] | undefined;
  let groundingMetadata: any;

  // Parse response parts
  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];

    if (candidate.content?.parts) {
      for (const part of candidate.content.parts) {
        if ('text' in part && part.text) {
          text += part.text;
        }
        if ('functionCall' in part && part.functionCall && part.functionCall.name) {
          toolCalls.push({
            name: part.functionCall.name,
            arguments: part.functionCall.args as Record<string, any>,
          });
        }
      }
    }

    // Extract grounding metadata if Google Search was used
    if (candidate.groundingMetadata) {
      groundingMetadata = candidate.groundingMetadata;

      // Extract search queries
      if (groundingMetadata.webSearchQueries) {
        searchQueries = groundingMetadata.webSearchQueries;
      }
    }
  }

  return {
    content: text || response.text || '',
    model: request.model,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    searchQueries,
    groundingMetadata,
    usage: {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    },
  };
}
