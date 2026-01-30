import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { callTranscription } from '../../services/transcription';
import { logger } from '../../config/logger';
import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return sendError(res, 400, API_ERROR_CODES.INVALID_INPUT, { message: 'No audio file uploaded' });
  }

  try {
    const response = await callTranscription({
      provider: 'openai', // For now, we only have openai
      file: req.file.buffer,
    });
    return res.json({ success: true, text: response.text });
  } catch (error) {
    logger.error({ error }, 'audio_transcription_failed');
    return sendError(res, 500, API_ERROR_CODES.EXTERNAL_SERVICE_ERROR, { message: 'Failed to transcribe audio' });
  }
});

export default router;
