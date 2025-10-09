import { Router } from 'express';
import oauthRoutes from '../oauth';
import accessRoutes from './access';
import i18nRoutes from './i18n';
import queuesRoutes from './queues';
import classificationRoutes from './classification';

const router = Router();

router.use('/oauth', oauthRoutes);
router.use('/i18n', i18nRoutes);
router.use('/queues', queuesRoutes);
router.use('/classification', classificationRoutes);
router.use('/', accessRoutes);

export default router;
