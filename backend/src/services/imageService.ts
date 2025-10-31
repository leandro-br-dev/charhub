import { prisma } from '../config/database';
import { imageAnalysisService } from './image-analysis';
import type { AgeRating, ContentTag, ImageType } from '../generated/prisma';

export async function addCharacterImage(params: {
  characterId: string;
  type: ImageType;
  url: string;
  key?: string | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  contentType?: string | null;
  runClassification?: boolean;
}) {
  const created = await prisma.characterImage.create({
    data: {
      characterId: params.characterId,
      type: params.type,
      url: params.url,
      key: params.key ?? null,
      width: params.width ?? null,
      height: params.height ?? null,
      sizeBytes: params.sizeBytes ?? null,
      contentType: params.contentType ?? null,
    },
  });

  if (params.runClassification) {
    try {
      const cls = await imageAnalysisService.classify({ imageUrl: params.url });
      await prisma.characterImage.update({
        where: { id: created.id },
        data: {
          ageRating: cls.ageRating as AgeRating,
          contentTags: cls.contentTags as ContentTag[],
          description: cls.description,
        },
      });
    } catch {
      // Best-effort classification; keep created record even if classification fails
    }
  }

  return created;
}

export async function listCharacterImages(characterId: string) {
  return prisma.characterImage.findMany({ where: { characterId }, orderBy: { createdAt: 'desc' } });
}

export async function getCharacterAvatar(characterId: string) {
  return prisma.characterImage.findFirst({ where: { characterId, type: 'AVATAR' }, orderBy: { createdAt: 'desc' } });
}

export async function getCharacterCover(characterId: string) {
  return prisma.characterImage.findFirst({ where: { characterId, type: 'COVER' }, orderBy: { createdAt: 'desc' } });
}

