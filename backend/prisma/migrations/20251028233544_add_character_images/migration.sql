-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('AVATAR', 'COVER', 'SAMPLE', 'STICKER', 'OTHER');

-- CreateTable
CREATE TABLE "CharacterImage" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "contentType" TEXT,
    "ageRating" "AgeRating" NOT NULL DEFAULT 'L',
    "contentTags" "ContentTag"[] DEFAULT ARRAY[]::"ContentTag"[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharacterImage_characterId_idx" ON "CharacterImage"("characterId");

-- CreateIndex
CREATE INDEX "CharacterImage_type_idx" ON "CharacterImage"("type");

-- CreateIndex
CREATE INDEX "CharacterImage_ageRating_idx" ON "CharacterImage"("ageRating");

-- AddForeignKey
ALTER TABLE "CharacterImage" ADD CONSTRAINT "CharacterImage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
