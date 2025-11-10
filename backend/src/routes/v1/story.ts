import { Router, Request, Response, NextFunction } from 'express';
import {
  createStory,
  getStoryById,
  listStories,
  updateStory,
  deleteStory,
  getMyStories,
} from '../../services/storyService';
import { requireAuth, optionalAuth } from '../../middleware/auth';

const router = Router();

// Create a new story (authenticated)
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorId = req.auth?.user?.id;
    if (!authorId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const story = await createStory(req.body, authorId);
    return res.status(201).json(story);
  } catch (error) {
    return next(error);
  }
});

// Get my stories (authenticated)
router.get('/my', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await getMyStories(userId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      sortBy: sortBy as 'createdAt' | 'updatedAt' | 'title' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

// List stories with filters (public + user's private stories)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      tags,
      ageRatings,
      contentTags,
      authorId,
      visibility,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const result = await listStories({
      search: search as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      ageRatings: ageRatings ? (ageRatings as string).split(',') : undefined,
      contentTags: contentTags ? (contentTags as string).split(',') : undefined,
      authorId: authorId as string | undefined,
      visibility: visibility as any,
      sortBy: sortBy as 'createdAt' | 'updatedAt' | 'title' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

// Get story by ID
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    const story = await getStoryById(id, userId);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    return res.status(200).json(story);
  } catch (error) {
    return next(error);
  }
});

// Update story (authenticated, author only)
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const story = await updateStory(id, req.body, userId);

    if (!story) {
      return res.status(404).json({ message: 'Story not found or unauthorized' });
    }

    return res.status(200).json(story);
  } catch (error) {
    return next(error);
  }
});

// Delete story (authenticated, author only)
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const deleted = await deleteStory(id, userId);

    if (!deleted) {
      return res.status(404).json({ message: 'Story not found or unauthorized' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
