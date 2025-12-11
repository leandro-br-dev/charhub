/**
 * Types for Character Generation Progress Events
 */

export enum CharacterGenerationStep {
  UPLOADING_IMAGE = 'uploading_image',
  ANALYZING_IMAGE = 'analyzing_image',
  EXTRACTING_DESCRIPTION = 'extracting_description',
  GENERATING_DETAILS = 'generating_details',
  GENERATING_HISTORY = 'generating_history',
  CREATING_CHARACTER = 'creating_character',
  QUEUING_AVATAR = 'queuing_avatar',
  GENERATING_AVATAR = 'generating_avatar',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface CharacterGenerationProgress {
  step: CharacterGenerationStep;
  progress: number; // 0-100
  message: string;
  data?: any; // Dados específicos da etapa
}

export interface CharacterGenerationImageAnalyzed {
  physicalDescription: string;
  visualStyle?: string;
  mood?: string;
}

export interface CharacterGenerationDetailsGenerated {
  firstName: string;
  lastName?: string;
  age?: number;
  gender?: string;
  species?: string;
  personality?: string;
}

export interface CharacterGenerationCompleted {
  characterId: string;
  character: any; // Character model
  avatarJobId?: string;
}

export interface CharacterGenerationError {
  error: string;
  details?: string;
}
