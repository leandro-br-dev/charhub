-- CreateTable
CREATE TABLE "AssetFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetFavorite_userId_idx" ON "AssetFavorite"("userId");

-- CreateIndex
CREATE INDEX "AssetFavorite_assetId_idx" ON "AssetFavorite"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetFavorite_userId_assetId_key" ON "AssetFavorite"("userId", "assetId");

-- CreateIndex
CREATE INDEX "SceneFavorite_userId_idx" ON "SceneFavorite"("userId");

-- CreateIndex
CREATE INDEX "SceneFavorite_sceneId_idx" ON "SceneFavorite"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneFavorite_userId_sceneId_key" ON "SceneFavorite"("userId", "sceneId");

-- AddForeignKey
ALTER TABLE "AssetFavorite" ADD CONSTRAINT "AssetFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFavorite" ADD CONSTRAINT "AssetFavorite_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneFavorite" ADD CONSTRAINT "SceneFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneFavorite" ADD CONSTRAINT "SceneFavorite_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
