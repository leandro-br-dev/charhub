import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { callLLM } from '../../services/llm';
import { logger } from '../../config/logger';

const router = Router();

/**
 * POST /api/v1/llm-test/tool-calling
 * Test LLM tool calling with web search
 *
 * Body:
 * - query: string (user query that may require web search)
 * - provider?: 'gemini' | 'openai' (default: gemini)
 * - autoExecute?: boolean (default: true)
 */
router.post('/tool-calling', requireAuth, async (req: Request, res: Response) => {
  try {
    const { query, provider = 'gemini', autoExecute = true } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a string',
      });
    }

    logger.info({ query, provider, autoExecute }, 'Testing LLM tool calling');

    const response = await callLLM({
      provider: provider as 'gemini' | 'openai',
      model: provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-exp',
      systemPrompt: 'You are a helpful assistant. Use web search when you need current or factual information.',
      userPrompt: query,
      allowBrowsing: true,
      autoExecuteTools: autoExecute,
      temperature: 0.7,
    });

    return res.json({
      success: true,
      data: {
        provider: response.provider,
        model: response.model,
        content: response.content,
        toolCalls: response.toolCalls,
        toolResults: response.toolResults,
        usage: response.usage,
      },
    });
  } catch (error) {
    logger.error({ error }, 'LLM tool calling test failed');
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/llm-test/character-autocomplete
 * Test character autocomplete with web search
 *
 * Body:
 * - firstName: string
 * - mode?: 'ai' | 'web' (default: 'web')
 * - ...other character fields
 */
router.post('/character-autocomplete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { firstName, mode = 'web', ...otherFields } = req.body;

    if (!firstName || typeof firstName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'firstName is required',
      });
    }

    const { runCharacterAutocomplete } = await import('../../agents/characterAutocompleteAgent');

    logger.info({ firstName, mode }, 'Testing character autocomplete');

    const result = await runCharacterAutocomplete(
      { firstName, ...otherFields },
      mode as 'ai' | 'web',
      'English'
    );

    return res.json({
      success: true,
      data: result,
      mode,
    });
  } catch (error) {
    logger.error({ error }, 'Character autocomplete test failed');
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
