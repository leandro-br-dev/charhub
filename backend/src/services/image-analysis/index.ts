import { classifyImageViaLLM, type ImageClassificationResult } from '../../agents/imageClassificationAgent';

export interface ImageAnalysisInput {
  imageUrl: string;
}

export const imageAnalysisService = {
  async classify(input: ImageAnalysisInput): Promise<ImageClassificationResult> {
    return await classifyImageViaLLM(input.imageUrl);
  },
};

