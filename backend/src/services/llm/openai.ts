import OpenAI from 'openai';
import type { ToolDefinition, ToolCall } from './tools';

export interface OpenAIRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | 'required';
}

export interface OpenAIResponse {
  content: string;
  model: string;
  toolCalls?: ToolCall[];
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

  // Add tools if provided
  if (request.tools && request.tools.length > 0) {
    completionParams.tools = request.tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    if (request.toolChoice) {
      if (request.toolChoice === 'auto' || request.toolChoice === 'none' || request.toolChoice === 'required') {
        completionParams.tool_choice = request.toolChoice;
      } else {
        // Specific tool name
        completionParams.tool_choice = {
          type: 'function',
          function: { name: request.toolChoice },
        };
      }
    }
  }

  const completion = await openai.chat.completions.create(completionParams);

  const choice = completion.choices[0];
  const content = choice.message.content || '';

  // Extract tool calls if present
  const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map(tc => {
    if (tc.type === 'function') {
      return {
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      };
    }
    return {
      id: tc.id,
      name: 'unknown',
      arguments: {},
    };
  });

  return {
    content,
    model: completion.model,
    toolCalls,
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
  };
}
