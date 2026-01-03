import { Visibility } from './common';

export type AgeRating =
  | 'L'
  | 'TEN'
  | 'TWELVE'
  | 'FOURTEEN'
  | 'SIXTEEN'
  | 'EIGHTEEN';

export type ContentTag =
  | 'VIOLENCE'
  | 'GORE'
  | 'SEXUAL'
  | 'NUDITY'
  | 'LANGUAGE'
  | 'DRUGS'
  | 'ALCOHOL'
  | 'HORROR'
  | 'PSYCHOLOGICAL'
  | 'DISCRIMINATION'
  | 'CRIME'
  | 'GAMBLING';

export type VisualStyle =
  | 'ANIME'
  | 'REALISTIC'
  | 'SEMI_REALISTIC'
  | 'CARTOON'
  | 'MANGA'
  | 'MANHWA'
  | 'COMIC'
  | 'CHIBI'
  | 'PIXEL_ART'
  | 'THREE_D';

export type StickerStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export type TagType = 'CHARACTER' | 'STORY';

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  weight: number;
  ageRating: AgeRating;
  originalLanguageCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lora {
  id: string;
  civitaiModelId?: string | null;
  civitaiVersionId?: string | null;
  name: string;
  modelType?: string | null;
  baseModel?: string | null;
  downloadCount?: number | null;
  modelUrl?: string | null;
  tags: string[];
  trainedWords: string[];
  nsfw: boolean;
  filename?: string | null;
  filepathRelative?: string | null;
  firstImageUrl?: string | null;
  imageUrls: string[];
  category?: string | null;
  term?: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attire {
  id: string;
  name: string;
  description?: string | null;
  gender?: string | null;
  promptHead?: string | null;
  promptBody?: string | null;
  promptFull?: string | null;
  previewImageUrl?: string | null;
  originalLanguageCode?: string | null;
  visibility: Visibility;
  userId: string;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  createdAt: string;
  updatedAt: string;
}

export interface CharacterSticker {
  id: string;
  characterId: string;
  emotionTag?: string | null;
  actionTag?: string | null;
  imageUrl?: string | null;
  promptUsed?: string | null;
  status: StickerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterCore {
  id: string;
  firstName: string;
  lastName?: string | null;
  age?: number | null;
  gender?: string | null;
  species?: string | { id: string; name: string } | null;
  style?: VisualStyle | null;
  reference?: string | null;
  avatar?: string | null;
  physicalCharacteristics?: string | null;
  personality?: string | null;
  history?: string | null;
  visibility: Visibility;
  originalLanguageCode?: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  userId: string;
  loraId?: string | null;
  mainAttireId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Character extends CharacterCore {
  lora?: Lora | null;
  mainAttire?: Attire | null;
  attires?: Attire[];
  tags?: Tag[];
  stickers?: CharacterSticker[];
  images?: CharacterImage[];
  creator?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface CharacterSummary extends CharacterCore {
  tagCount?: number;
  attireCount?: number;
  stickerCount?: number;
}

export interface CharacterImage {
  id: string;
  characterId?: string;
  type: 'AVATAR' | 'COVER' | 'SAMPLE' | 'STICKER' | 'OTHER' | 'REFERENCE';
  url: string;
  key?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  contentType?: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  description?: string | null;
  content?: string | null; // For REFERENCE type: 'avatar' | 'front' | 'side' | 'back'
  isActive?: boolean;
  createdAt?: string;
}

export interface CharacterListParams {
  search?: string;
  tags?: string[];
  ageRatings?: AgeRating[];
  contentTags?: ContentTag[];
  visibility?: Visibility;
  gender?: string | string[];
  species?: string | string[];
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  limit?: number;
  page?: number;
  public?: boolean; // When false, returns only user's own characters
}

export interface CharacterListResponse {
  items: CharacterSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CharacterPayload {
  firstName: string;
  lastName?: string | null;
  age?: number | null;
  gender?: string | null;
  species?: string | null;
  style?: VisualStyle | null;
  reference?: string | null;
  avatar?: string | null;
  physicalCharacteristics?: string | null;
  personality?: string | null;
  history?: string | null;
  visibility?: Visibility;
  originalLanguageCode?: string | null;
  ageRating: AgeRating;
  contentTags: ContentTag[];
  loraId?: string | null;
  mainAttireId?: string | null;
  tagIds?: string[];
  attireIds?: string[];
}

export interface CharacterFormValues extends CharacterPayload {
  stickers?: CharacterSticker[];
  cover?: string | null;
}

export interface CharacterMutationResult {
  success: boolean;
  character?: Character;
  message?: string;
}

export interface CharacterAvatarUploadResult {
  url: string;
  key: string;
  characterId?: string | null;
}

export interface CharacterDraftSummary {
  avatar?: string | null;
  displayName: string;
  ageRating: AgeRating;
  contentTags: ContentTag[];
}

export const EMPTY_CHARACTER_FORM: CharacterFormValues = {
  firstName: '',
  lastName: null,
  age: null,
  gender: null,
  species: null,
  style: 'ANIME',
  reference: null,
  avatar: null,
  physicalCharacteristics: null,
  personality: null,
  history: null,
  visibility: Visibility.PUBLIC,
  originalLanguageCode: null, // Will be set from user's preferredLanguage
  ageRating: 'L',
  contentTags: [],
  loraId: null,
  mainAttireId: null,
  tagIds: [],
  attireIds: [],
  stickers: [],
  cover: null
};
