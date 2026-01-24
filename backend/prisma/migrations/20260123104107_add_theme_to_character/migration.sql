-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('DARK_FANTASY', 'FANTASY', 'FURRY', 'SCI_FI', 'GENERAL');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "theme" "Theme" DEFAULT 'DARK_FANTASY';

-- AlterTable
ALTER TABLE "VisualStyleConfig" ADD COLUMN     "supportedThemes" "Theme"[];

-- CreateTable
CREATE TABLE "StyleThemeCheckpoint" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "theme" "Theme" NOT NULL,
    "loraId" TEXT,
    "loraStrength" DOUBLE PRECISION,

    CONSTRAINT "StyleThemeCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StyleThemeCheckpoint_styleId_idx" ON "StyleThemeCheckpoint"("styleId");

-- CreateIndex
CREATE INDEX "StyleThemeCheckpoint_theme_idx" ON "StyleThemeCheckpoint"("theme");

-- CreateIndex
CREATE INDEX "StyleThemeCheckpoint_checkpointId_idx" ON "StyleThemeCheckpoint"("checkpointId");

-- CreateIndex
CREATE UNIQUE INDEX "StyleThemeCheckpoint_styleId_theme_key" ON "StyleThemeCheckpoint"("styleId", "theme");

-- AddForeignKey
ALTER TABLE "StyleThemeCheckpoint" ADD CONSTRAINT "StyleThemeCheckpoint_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "VisualStyleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleThemeCheckpoint" ADD CONSTRAINT "StyleThemeCheckpoint_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "StyleCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleThemeCheckpoint" ADD CONSTRAINT "StyleThemeCheckpoint_loraId_fkey" FOREIGN KEY ("loraId") REFERENCES "StyleLora"("id") ON DELETE SET NULL ON UPDATE CASCADE;
