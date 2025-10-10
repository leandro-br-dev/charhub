import { Router } from 'express';
import oauthRoutes from '../oauth';
import accessRoutes from './access';
import i18nRoutes from './i18n';
import queuesRoutes from './queues';
import classificationRoutes from './classification';
import storageRoutes from './storage';
import charactersRoutes from './characters';
import lorasRoutes from './loras';
import attiresRoutes from './attires';

const router = Router();

router.use('/oauth', oauthRoutes);
router.use('/i18n', i18nRoutes);
router.use('/queues', queuesRoutes);
router.use('/classification', classificationRoutes);
router.use('/storage', storageRoutes);
router.use('/characters', charactersRoutes);
router.use('/loras', lorasRoutes);
router.use('/attires', attiresRoutes);
router.use('/', accessRoutes);

export default router;
