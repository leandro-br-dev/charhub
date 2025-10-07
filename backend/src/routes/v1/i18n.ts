import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { getTranslationResources, SUPPORTED_NAMESPACES } from '../../services/translationService';

const router = Router();

router.get('/namespaces/list', (_req: Request, res: Response) => {
  res.json({ namespaces: SUPPORTED_NAMESPACES });
});

router.get('/:lang/:namespace', async (req: Request, res: Response, next: NextFunction) => {
  const { lang, namespace } = req.params;
  try {
    const resources = await getTranslationResources(lang, namespace);

    // Cache translations for 1 hour (they're static after build)
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('ETag', `"${lang}-${namespace}"`);

    res.json(resources);
  } catch (error) {
    next(error);
  }
});

export default router;