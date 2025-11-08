import { webSearchTool } from './webSearch';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  execute: (args: any) => Promise<string>;
}

export interface ToolCall {
  id?: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId?: string;
  toolName: string;
  result: string;
  error?: string;
}

/**
 * Available tools registry
 */
export const availableTools: Record<string, ToolDefinition> = {
  web_search: webSearchTool,
};

/**
 * Get tool definition by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return availableTools[name];
}

/**
 * Execute a tool call
 */
export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const tool = getTool(toolCall.name);

  if (!tool) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result: '',
      error: `Tool "${toolCall.name}" not found`,
    };
  }

  try {
    const result = await tool.execute(toolCall.arguments);
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute multiple tool calls in parallel
 */
export async function executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
  return Promise.all(toolCalls.map(executeTool));
}

/**
 * Get tool definitions in format expected by providers
 */
export function getToolDefinitions(toolNames?: string[]): ToolDefinition[] {
  if (!toolNames || toolNames.length === 0) {
    return Object.values(availableTools);
  }

  return toolNames
    .map(name => availableTools[name])
    .filter((tool): tool is ToolDefinition => tool !== undefined);
}
