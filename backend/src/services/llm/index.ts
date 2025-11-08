import { callGemini } from './gemini';
import { callOpenAI } from './openai';
import { callGrok } from './grok';
import { getToolDefinitions, executeTools, type ToolCall, type ToolResult } from './tools';
import { logger } from '../../config/logger';
import llmModels from '../../data/llm-models.json';

export type LLMProvider = 'gemini' | 'openai' | 'grok';

export interface LLMRequest {
  provider: LLMProvider;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[]; // Array of tool names to enable (e.g., ['web_search'])
  toolChoice?: 'auto' | 'none' | 'required' | string; // Specific tool name
  allowBrowsing?: boolean; // Shortcut to enable web_search tool
  autoExecuteTools?: boolean; // If true, automatically execute tool calls and return final result
}

export interface LLMResponse {
  provider: LLMProvider;
  model: string;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  searchQueries?: string[]; // Google Search queries (Gemini only)
  groundingMetadata?: any;   // Grounding sources (Gemini only)
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Re-export tool types for convenience
export type { ToolCall, ToolResult } from './tools';

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

  // Prepare tools
  let toolNames = request.tools || [];

  // For Gemini: use native Google Search instead of custom web_search
  const useGeminiGoogleSearch = request.provider === 'gemini' && request.allowBrowsing;

  // For other providers: use custom web_search tool
  if (request.provider !== 'gemini' && request.allowBrowsing && !toolNames.includes('web_search')) {
    toolNames = [...toolNames, 'web_search'];
  }

  const toolDefinitions = toolNames.length > 0 ? getToolDefinitions(toolNames) : undefined;

  let response;

  switch (request.provider) {
    case 'gemini':
      response = await callGemini({
        model: request.model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        tools: toolDefinitions,
        toolChoice: request.toolChoice as 'auto' | 'none' | 'required' | undefined,
        useGoogleSearch: useGeminiGoogleSearch, // Use native Google Search
      });
      break;

    case 'openai':
      response = await callOpenAI({
        model: request.model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        tools: toolDefinitions,
        toolChoice: request.toolChoice as 'auto' | 'none' | 'required' | undefined,
      });
      break;

    case 'grok':
      // Grok doesn't support tools yet, fallback to basic call
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

  // Auto-execute tools if requested
  let toolResults: ToolResult[] | undefined;
  if (request.autoExecuteTools && response.toolCalls && response.toolCalls.length > 0) {
    logger.info(
      { provider: request.provider, toolCalls: response.toolCalls.length },
      'Auto-executing tool calls'
    );

    try {
      toolResults = await executeTools(response.toolCalls);

      // Log tool execution results
      for (const result of toolResults) {
        if (result.error) {
          logger.error(
            { toolName: result.toolName, error: result.error },
            'Tool execution failed'
          );
        } else {
          logger.debug({ toolName: result.toolName }, 'Tool executed successfully');
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to execute tools');
    }
  }

  // Log Google Search queries if present (Gemini only)
  const searchQueries = ('searchQueries' in response ? response.searchQueries : undefined) as string[] | undefined;
  const groundingMetadata = ('groundingMetadata' in response ? response.groundingMetadata : undefined) as any;

  if (searchQueries && Array.isArray(searchQueries) && searchQueries.length > 0) {
    logger.info(
      {
        provider: request.provider,
        searchQueries,
        sourcesCount: groundingMetadata?.groundingChunks?.length || 0
      },
      'Google Search grounding used'
    );
  }

  return {
    provider: request.provider,
    model: response.model,
    content: response.content,
    toolCalls: response.toolCalls,
    toolResults,
    searchQueries,
    groundingMetadata,
    usage: response.usage,
  };
}
