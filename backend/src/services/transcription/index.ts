import { callOpenAI } from './openai';

export type TranscriptionProvider = 'openai'; // Add other providers here in the future

export interface TranscriptionRequest {
  provider: TranscriptionProvider;
  file: Buffer;
}

export interface TranscriptionResponse {
  provider: TranscriptionProvider;
  text: string;
}

export async function callTranscription(request: TranscriptionRequest): Promise<TranscriptionResponse> {
  if (request.provider !== 'openai') {
    throw new Error(`Invalid provider: ${request.provider}`);
  }

  const response = await callOpenAI({
    file: request.file,
  });

  return {
    provider: request.provider,
    text: response.text,
  };
}
