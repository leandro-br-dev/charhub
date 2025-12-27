import { Router, type Request, type Response } from 'express';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

const router = Router();

// GET /api/v1/tags
// Optional query params: search (string), type (TagType), limit (number), skip (number)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, type } = req.query as { search?: string; type?: string };
    const limit = Math.max(0, Math.min(Number(req.query.limit ?? 20), 100));
    const skip = Math.max(0, Number(req.query.skip ?? 0));

    const where: any = {};
    if (type && typeof type === 'string') {
      where.type = type.toUpperCase();
    }
    if (search && typeof search === 'string' && search.trim().length > 0) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: [{ weight: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.tag.count({ where }),
    ]);

    // Optional translations enrichment
    const includeTranslations = String(req.query.includeTranslations || '').toLowerCase() === 'true';
    const lang = typeof req.query.lang === 'string' ? req.query.lang : '';

    if (!includeTranslations) {
      return res.json({ success: true, data: items, count: total });
    }

    // Resolve translation file path
    const mapLangDir = (code: string): string | null => {
      const lc = (code || '').toLowerCase();
      const map: Record<string, string> = {
        'pt-br': 'pt-br', 'pt': 'pt-br',
        'en': '_source', 'en-us': '_source', 'en-gb': '_source',
        'es-es': 'es-es', 'es': 'es-es',
        'fr-fr': 'fr-fr', 'fr': 'fr-fr',
        'de-de': 'de-de', 'de': 'de-de',
        'zh-cn': 'zh-cn', 'zh': 'zh-cn',
        'hi-in': 'hi-in', 'hi': 'hi-in',
        'ar-sa': 'ar-sa', 'ar': 'ar-sa',
        'ru-ru': 'ru-ru', 'ru': 'ru-ru',
        'ja-jp': 'ja-jp', 'ja': 'ja-jp',
        'ko-kr': 'ko-kr', 'ko': 'ko-kr',
        'it-it': 'it-it', 'it': 'it-it',
      };
      return map[lc] || null;
    };

    const langDir = mapLangDir(lang) || '_source';
    // Only character tags translation file for now
    const fs = await import('node:fs');
    const path = await import('node:path');
    const translationsPath = path.resolve(process.cwd(), 'translations', langDir, 'tags-character.json');
    let resources: Record<string, any> | null = null;
    try {
      const raw = fs.readFileSync(translationsPath, 'utf8');
      const json = JSON.parse(raw);
      resources = (json && json.resources) || null;
    } catch (_e) {
      logger.warn({ translationsPath }, 'tags_translation_file_missing_or_invalid');
      resources = null;
    }

    const enriched = items.map(tag => {
      const key = tag.name; // canonical name used as key
      const entry = resources && resources[key];
      let label = key;
      let description: string | null = null;
      if (entry) {
        if (typeof entry === 'string') {
          description = entry;
        } else if (typeof entry === 'object' && entry !== null) {
          label = entry.name || key;
          description = entry.description || null;
        }
      }
      return { ...tag, label, description };
    });

    return res.json({ success: true, data: enriched, count: total });
  } catch (error) {
    logger.error({ error }, 'tags_list_failed');
    return res.status(500).json({ success: false, message: 'Failed to list tags' });
  }
});

export default router;
