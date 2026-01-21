/**
 * Context formatting utilities for agent prompts
 *
 * This module provides utilities for formatting user and character context
 * for use in LLM prompts, with support for:
 * - User config overrides
 * - Persona/roleplay characters
 * - PII protection
 */

export * from './context.types';
export * from './formatters/userContextFormatter';
