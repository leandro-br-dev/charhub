/**
 * Types for Story Generation Progress Events
 */

export enum StoryGenerationStep {
  UPLOADING_IMAGE = 'uploading_image',
  ANALYZING_IMAGE = 'analyzing_image',
  EXTRACTING_DESCRIPTION = 'extracting_description',
  GENERATING_CONCEPT = 'generating_concept',
  GENERATING_PLOT = 'generating_plot',
  WRITING_SCENE = 'writing_scene',
  GENERATING_COVER = 'generating_cover',
  CREATING_STORY = 'creating_story',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface StoryGenerationProgress {
  step: StoryGenerationStep;
  progress: number; // 0-100
  message: string;
  data?: any; // Specific data for the step
}

export interface StoryImageAnalyzed {
  setting?: string; // e.g., "fantasy castle", "modern city", "space station"
  mood?: string; // e.g., "mysterious", "peaceful", "tense"
  timeOfDay?: string; // e.g., "day", "night", "sunset"
  visualStyle?: string; // e.g., "anime", "realistic", "cartoon"
  suggestedGenre?: string; // e.g., "fantasy", "sci-fi", "romance"
  keyElements?: string[]; // e.g., ["sword", "magic circle", "throne"]
}

export interface StoryConceptGenerated {
  title: string;
  genre?: string;
  mood?: string;
}

export interface StoryPlotGenerated {
  synopsis: string;
  objectives: string[];
}

export interface StorySceneWritten {
  initialText: string;
}

export interface StoryCoverGenerated {
  coverImageUrl?: string;
  coverImageJobId?: string;
}

export interface StoryGenerationCompleted {
  storyId: string;
  story: any; // Story model
  coverImageJobId?: string;
}

export interface StoryGenerationError {
  error: string;
  details?: string;
}
