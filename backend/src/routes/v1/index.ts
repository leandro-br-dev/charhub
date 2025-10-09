import { Router } from 'express';
import oauthRoutes from '../oauth';
import accessRoutes from './access';
import i18nRoutes from './i18n';
import queuesRoutes from './queues';

const router = Router();

router.use('/oauth', oauthRoutes);
router.use('/i18n', i18nRoutes);
router.use('/queues', queuesRoutes);
router.use('/', accessRoutes);

export default router;