-- CreateTable
CREATE TABLE "FavoriteCharacter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteCharacter_userId_idx" ON "FavoriteCharacter"("userId");

-- CreateIndex
CREATE INDEX "FavoriteCharacter_characterId_idx" ON "FavoriteCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteCharacter_userId_characterId_key" ON "FavoriteCharacter"("userId", "characterId");

-- AddForeignKey
ALTER TABLE "FavoriteCharacter" ADD CONSTRAINT "FavoriteCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
