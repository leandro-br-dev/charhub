export interface ModelSelection {
  provider: 'gemini' | 'grok' | 'openrouter';
  model: string;
  reasoning: string;
}

export interface RoutingContext {
  feature: 'CHAT' | 'CHARACTER_GENERATION' | 'STORY_GENERATION' | 'IMAGE_ANALYSIS' | 'CONTENT_TRANSLATION' | 'SYSTEM_TRANSLATION';
}

/**
 * Model Router Service
 *
 * Routes LLM requests to the appropriate model based on feature type.
 * Content filtering is handled separately by contentClassificationService.
 *
 * Model Selection Strategy:
 * - Venice AI (FREE) for all chat
 * - Grok 4-1 Fast Reasoning for character/story generation
 * - Grok 4-1 Fast Non-Reasoning for image analysis and content translation
 * - Gemini 3 Flash Preview for system translation (SFW)
 * - Grok 4-1 Fast Non-Reasoning for system translation (NSFW)
 */
class ModelRouterService {
  /**
   * Get the optimal model for a given feature
   *
   * @param routingContext - Context for routing decision
   * @returns Selected model with reasoning
   */
  async getModel(routingContext: RoutingContext): Promise<ModelSelection> {
    const { feature } = routingContext;

    switch (feature) {
      case 'CHAT':
        return {
          provider: 'openrouter',
          model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', // Venice Uncensored (free)
          reasoning: 'Chat - using Venice AI (FREE)',
        };

      case 'CHARACTER_GENERATION':
        return {
          provider: 'grok',
          model: 'grok-4-1-fast-reasoning',
          reasoning: 'Character generation - using Grok 4-1 (NSFW-friendly, cost-effective)',
        };

      case 'STORY_GENERATION':
        return {
          provider: 'grok',
          model: 'grok-4-1-fast-reasoning',
          reasoning: 'Story generation - using Grok 4-1 (NSFW-friendly, cost-effective)',
        };

      case 'IMAGE_ANALYSIS':
        return {
          provider: 'grok',
          model: 'grok-4-1-fast-non-reasoning',
          reasoning: 'Image analysis - using Grok 4-1 (best vision, low censorship)',
        };

      case 'CONTENT_TRANSLATION':
        return {
          provider: 'grok',
          model: 'grok-4-1-fast-non-reasoning',
          reasoning: 'Content translation - using Grok 4-1 (NSFW-friendly)',
        };

      case 'SYSTEM_TRANSLATION':
        // System translation needs to be called with isNSFW parameter
        // Default to SFW model
        return {
          provider: 'gemini',
          model: 'gemini-3-flash-preview',
          reasoning: 'System translation (SFW) - using Gemini 3 Flash',
        };

      default:
        return {
          provider: 'gemini',
          model: 'gemini-3-flash-preview',
          reasoning: 'Default - using Gemini 3 Flash',
        };
    }
  }

  /**
   * Get model for system translation with NSFW support
   * This is a special case where the model depends on content being translated
   */
  getSystemTranslationModel(isNSFW: boolean): ModelSelection {
    if (isNSFW) {
      return {
        provider: 'grok',
        model: 'grok-4-1-fast-non-reasoning',
        reasoning: 'System translation (NSFW) - using Grok 4-1 (NSFW-friendly)',
      };
    }

    return {
      provider: 'gemini',
      model: 'gemini-3-flash-preview',
      reasoning: 'System translation (SFW) - using Gemini 3 Flash',
    };
  }
}

// Export singleton instance
export const modelRouter = new ModelRouterService();
