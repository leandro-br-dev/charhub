import OpenAI from 'openai';

export interface GrokRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GrokResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callGrok(request: GrokRequest): Promise<GrokResponse> {
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey) {
    throw new Error('GROK_API_KEY not configured');
  }

  // Grok uses OpenAI-compatible API
  const grok = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
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

  const completion = await grok.chat.completions.create({
    model: request.model,
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
