import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { getTranslationResources, discoverNamespaces } from '../../services/translationService';

const router = Router();

router.get('/namespaces/list', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const namespaces = await discoverNamespaces();
    res.json({ namespaces });
  } catch (error) {
    next(error);
  }
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