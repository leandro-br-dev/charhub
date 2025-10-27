import { callGemini } from './gemini';
import { callOpenAI } from './openai';
import { callGrok } from './grok';
import llmModels from '../../data/llm-models.json';

export type LLMProvider = 'gemini' | 'openai' | 'grok';

export interface LLMRequest {
  provider: LLMProvider;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  // TODO(tools): Add structured tool definitions and execution results.
  // The providers currently ignore tool calls; extend provider adapters to support
  // OpenAI tool_choice/functions and Gemini tool execution where available.
  // For now, these flags are accepted but unused.
  tools?: Array<{ name: string; description?: string; schema?: unknown }>;
  toolChoice?: 'auto' | 'none' | string;
  allowBrowsing?: boolean; // Hint for agents to use web search when supported
}

export interface LLMResponse {
  provider: LLMProvider;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Get list of available models for a provider
 */
export function getModels(provider: LLMProvider) {
  return llmModels.providers[provider]?.models || {};
}

/**
 * Get all providers and their models
 */
export function getAllModels() {
  return llmModels.providers;
}

/**
 * Validate if a model exists for a provider
 */
export function validateModel(provider: LLMProvider, model: string): boolean {
  const models = getModels(provider);
  return model in models;
}

/**
 * Main LLM service - routes to appropriate provider
 */
export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  // Validate provider
  if (!['gemini', 'openai', 'grok'].includes(request.provider)) {
    throw new Error(`Invalid provider: ${request.provider}`);
  }

  // Validate model
  if (!validateModel(request.provider, request.model)) {
    throw new Error(`Invalid model ${request.model} for provider ${request.provider}`);
  }

  let response;

  switch (request.provider) {
    case 'gemini':
      response = await callGemini({
        model: request.model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });
      break;

    case 'openai':
      response = await callOpenAI({
        model: request.model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });
      break;

    case 'grok':
      response = await callGrok({
        model: request.model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });
      break;

    default:
      throw new Error(`Unsupported provider: ${request.provider}`);
  }

  return {
    provider: request.provider,
    model: response.model,
    content: response.content,
    usage: response.usage,
  };
}
