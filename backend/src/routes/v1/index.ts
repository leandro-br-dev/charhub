import { Router } from 'express';
import oauthRoutes from '../oauth';
import accessRoutes from './access';
import i18nRoutes from './i18n';
import queuesRoutes from './queues';
import classificationRoutes from './classification';
import storageRoutes from './storage';
import charactersRoutes from './characters';
import assistantsRoutes from './assistants';
import lorasRoutes from './loras';
import attiresRoutes from './attires';
import usersRoutes from './users';
import conversationsRoutes from './conversations';
import mediaRoutes from './media';
import transcriptionRoutes from './transcription';
import tagsRoutes from './tags';
import storyRoutes from './story';

const router = Router();

router.use('/oauth', oauthRoutes);
router.use('/i18n', i18nRoutes);
router.use('/queues', queuesRoutes);
router.use('/classification', classificationRoutes);
router.use('/storage', storageRoutes);
router.use('/characters', charactersRoutes);
router.use('/assistants', assistantsRoutes);
router.use('/loras', lorasRoutes);
router.use('/attires', attiresRoutes);
router.use('/users', usersRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/media', mediaRoutes);
router.use('/transcribe', transcriptionRoutes);
router.use('/tags', tagsRoutes);
router.use('/stories', storyRoutes);
router.use('/', accessRoutes);

export default router;
