import { Router, Request, Response } from 'express';
import { callLLM, getAllModels, getModels, type LLMProvider } from '../../services/llm';

const router = Router();

/**
 * GET /api/v1/llm/models
 * List all available models
 */
router.get('/models', (_req: Request, res: Response) => {
  const models = getAllModels();
  res.json({
    success: true,
    data: models,
  });
});

/**
 * GET /api/v1/llm/models/:provider
 * List models for a specific provider
 */
router.get('/models/:provider', (req: Request, res: Response) => {
  const provider = req.params.provider as LLMProvider;

  if (!['gemini', 'openai', 'grok'].includes(provider)) {
    res.status(400).json({
      success: false,
      error: `Invalid provider: ${provider}`,
    });
    return;
  }

  const models = getModels(provider);
  res.json({
    success: true,
    provider,
    data: models,
  });
});

/**
 * POST /api/v1/llm/chat
 * Generate completion from LLM
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { provider, model, systemPrompt, userPrompt, temperature, maxTokens } = req.body;

    // Validation
    if (!provider || !model || !userPrompt) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: provider, model, userPrompt',
      });
      return;
    }

    // Call LLM service
    const response = await callLLM({
      provider,
      model,
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate completion',
    });
  }
});

export default router;
