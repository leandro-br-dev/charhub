-- CreateSceneImageType
CREATE TYPE "SceneImageType" AS ENUM ('COVER', 'MAP', 'EXTERIOR', 'INTERIOR', 'DETAIL', 'PANORAMA', 'MISC');

-- CreateSceneAreaImageType
CREATE TYPE "SceneAreaImageType" AS ENUM ('ENVIRONMENT', 'MAP', 'DETAIL', 'PANORAMA', 'MISC');

-- Alter SceneImage table
ALTER TABLE "SceneImage" ALTER COLUMN "imageType" TYPE "SceneImageType" USING (
  CASE "imageType"
    WHEN 'cover' THEN 'COVER'::"SceneImageType"
    WHEN 'map' THEN 'MAP'::"SceneImageType"
    WHEN 'panorama' THEN 'PANORAMA'::"SceneImageType"
    WHEN 'detail' THEN 'DETAIL'::"SceneImageType"
    WHEN 'exterior' THEN 'EXTERIOR'::"SceneImageType"
    WHEN 'interior' THEN 'INTERIOR'::"SceneImageType"
    WHEN 'misc' THEN 'MISC'::"SceneImageType"
    ELSE 'MISC'::"SceneImageType"
  END
);

-- Alter SceneAreaImage table
ALTER TABLE "SceneAreaImage" ALTER COLUMN "imageType" TYPE "SceneAreaImageType" USING (
  CASE "imageType"
    WHEN 'environment' THEN 'ENVIRONMENT'::"SceneAreaImageType"
    WHEN 'map' THEN 'MAP'::"SceneAreaImageType"
    WHEN 'detail' THEN 'DETAIL'::"SceneAreaImageType"
    WHEN 'panorama' THEN 'PANORAMA'::"SceneAreaImageType"
    WHEN 'misc' THEN 'MISC'::"SceneAreaImageType"
    ELSE 'MISC'::"SceneAreaImageType"
  END
);
