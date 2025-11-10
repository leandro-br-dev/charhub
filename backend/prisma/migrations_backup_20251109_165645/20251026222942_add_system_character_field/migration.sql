-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "isSystemCharacter" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Character_isSystemCharacter_idx" ON "Character"("isSystemCharacter");
