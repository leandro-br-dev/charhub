import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { callTranscription } from '../../services/transcription';
import { logger } from '../../config/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No audio file uploaded' });
  }

  try {
    const response = await callTranscription({
      provider: 'openai', // For now, we only have openai
      file: req.file.buffer,
    });
    return res.json({ success: true, text: response.text });
  } catch (error) {
    logger.error({ error }, 'audio_transcription_failed');
    return res.status(500).json({ success: false, error: 'Failed to transcribe audio' });
  }
});

export default router;
