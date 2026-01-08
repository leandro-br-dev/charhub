import OpenAI from 'openai';

export interface OpenRouterRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  toolCalls?: any[]; // OpenRouter doesn't support tools yet, but interface expects it
  toolResults?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callOpenRouter(request: OpenRouterRequest): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // OpenRouter uses OpenAI-compatible API
  const openrouter = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://charhub.app', // Required by OpenRouter
      'X-Title': 'CharHub', // Required by OpenRouter
    },
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (request.systemPrompt) {
    messages.push({
      role: 'system',
      content: request.systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: request.userPrompt,
  });

  const completion = await openrouter.chat.completions.create({
    model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', // Venice Uncensored (free)
    messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens,
  });

  const choice = completion.choices[0];
  const content = choice.message.content || '';

  return {
    content,
    model: completion.model,
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
  };
}
