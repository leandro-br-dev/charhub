import OpenAI from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';

const openai = new OpenAI();

export interface OpenAIRequest {
  file: Buffer;
}

export interface OpenAIResponse {
  text: string;
}

export async function callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
  const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
  fs.writeFileSync(tempFilePath, request.file);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
    });
    return { text: transcription.text };
  } finally {
    fs.unlinkSync(tempFilePath);
  }
}
