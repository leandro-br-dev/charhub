-- Seed data for CharHub database
-- This script populates essential master data that should exist before users can interact with the app

-- Insert Plans (Subscription plans)
INSERT INTO "Plan" (id, name, description, "monthlyPrice", "yearlyPrice", "maxCharacters", "maxStorageGB", "createdAt", "updatedAt")
VALUES
  ('plan_free', 'Free', 'Basic access', 0, 0, 5, 1, NOW(), NOW()),
  ('plan_pro', 'Pro', 'Enhanced features', 9.99, 99.99, 50, 10, NOW(), NOW()),
  ('plan_premium', 'Premium', 'Everything', 29.99, 299.99, 999, 100, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert ServiceCreditCost (How many credits each service costs)
INSERT INTO "ServiceCreditCost" (id, service, "baseCost", description, "createdAt", "updatedAt")
VALUES
  ('cost_chat_default', 'CHAT', 1, 'Chat message', NOW(), NOW()),
  ('cost_image_generation', 'IMAGE_GENERATION', 10, 'Image generation via AI', NOW(), NOW()),
  ('cost_story_generation', 'STORY_GENERATION', 5, 'Story generation via AI', NOW(), NOW()),
  ('cost_character_creation', 'CHARACTER_CREATION', 5, 'Create new character', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Tags (Content categorization)
INSERT INTO "Tag" (id, type, name, label, color, "createdAt", "updatedAt")
VALUES
  -- Character Tags
  ('tag_char_anime', 'CHARACTER', 'anime', 'Anime', '#FF69B4', NOW(), NOW()),
  ('tag_char_fantasy', 'CHARACTER', 'fantasy', 'Fantasy', '#8B4513', NOW(), NOW()),
  ('tag_char_scifi', 'CHARACTER', 'scifi', 'Sci-Fi', '#4169E1', NOW(), NOW()),
  ('tag_char_romance', 'CHARACTER', 'romance', 'Romance', '#FF1493', NOW(), NOW()),
  ('tag_char_horror', 'CHARACTER', 'horror', 'Horror', '#2F4F4F', NOW(), NOW()),
  ('tag_char_comedy', 'CHARACTER', 'comedy', 'Comedy', '#FFD700', NOW(), NOW()),
  ('tag_char_mystery', 'CHARACTER', 'mystery', 'Mystery', '#8B008B', NOW(), NOW()),
  ('tag_char_adventure', 'CHARACTER', 'adventure', 'Adventure', '#FF8C00', NOW(), NOW()),
  ('tag_char_drama', 'CHARACTER', 'drama', 'Drama', '#DC143C', NOW(), NOW()),
  ('tag_char_historical', 'CHARACTER', 'historical', 'Historical', '#8B7355', NOW(), NOW()),
  ('tag_char_supernatural', 'CHARACTER', 'supernatural', 'Supernatural', '#9370DB', NOW(), NOW()),
  ('tag_char_cyberpunk', 'CHARACTER', 'cyberpunk', 'Cyberpunk', '#00FF00', NOW(), NOW()),

  -- Story Tags
  ('tag_story_short', 'STORY', 'short-story', 'Short Story', '#87CEEB', NOW(), NOW()),
  ('tag_story_novel', 'STORY', 'novel', 'Novel', '#4169E1', NOW(), NOW()),
  ('tag_story_serialized', 'STORY', 'serialized', 'Serialized', '#20B2AA', NOW(), NOW()),
  ('tag_story_dark', 'STORY', 'dark', 'Dark', '#2F4F4F', NOW(), NOW()),
  ('tag_story_wholesome', 'STORY', 'wholesome', 'Wholesome', '#FFB6C1', NOW(), NOW()),
  ('tag_story_action', 'STORY', 'action', 'Action', '#FF4500', NOW(), NOW()),
  ('tag_story_slice_of_life', 'STORY', 'slice-of-life', 'Slice of Life', '#DEB887', NOW(), NOW()),
  ('tag_story_tragedy', 'STORY', 'tragedy', 'Tragedy', '#8B0000', NOW(), NOW()),
  ('tag_story_comedy_story', 'STORY', 'comedy-story', 'Comedy Story', '#FFD700', NOW(), NOW()),
  ('tag_story_philosophical', 'STORY', 'philosophical', 'Philosophical', '#9932CC', NOW(), NOW()),

  -- Asset Tags
  ('tag_asset_portrait', 'ASSET', 'portrait', 'Portrait', '#C0C0C0', NOW(), NOW()),
  ('tag_asset_landscape', 'ASSET', 'landscape', 'Landscape', '#A9A9A9', NOW(), NOW()),
  ('tag_asset_illustration', 'ASSET', 'illustration', 'Illustration', '#D3D3D3', NOW(), NOW()),
  ('tag_asset_fanart', 'ASSET', 'fanart', 'Fanart', '#F0E68C', NOW(), NOW()),
  ('tag_asset_original', 'ASSET', 'original', 'Original', '#FFFACD', NOW(), NOW()),
  ('tag_asset_nsfw', 'ASSET', 'nsfw', 'NSFW', '#FF0000', NOW(), NOW()),
  ('tag_asset_sfw', 'ASSET', 'sfw', 'SFW', '#00FF00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Log completion
SELECT 'Seed data loaded successfully' AS status;
