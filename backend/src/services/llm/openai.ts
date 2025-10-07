import OpenAI from 'openai';

export interface OpenAIRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const openai = new OpenAI({ apiKey });

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

  // GPT-5 models don't support temperature, top_p, or max_tokens parameters
  // They only work with default values (temperature=1)
  const isGPT5 = request.model.startsWith('gpt-5') || request.model.startsWith('gpt-realtime');

  const completionParams: OpenAI.Chat.ChatCompletionCreateParams = {
    model: request.model,
    messages,
  };

  // Only add parameters for non-GPT-5 models
  if (!isGPT5) {
    completionParams.temperature = request.temperature ?? 0.7;
    if (request.maxTokens) {
      completionParams.max_tokens = request.maxTokens;
    }
  }

  const completion = await openai.chat.completions.create(completionParams);

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
