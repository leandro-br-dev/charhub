-- Seed data for CharHub database
-- This script populates essential master data that should exist before users can interact with the app

-- Insert Plans (Subscription plans)
-- Columns: id, tier (enum: FREE, PLUS, PREMIUM), name, priceMonthly, creditsPerMonth, description, features, isActive, createdAt, updatedAt, paypalPlanId
INSERT INTO "Plan" (id, tier, name, "priceMonthly", "creditsPerMonth", description, "isActive", "createdAt", "updatedAt")
VALUES
  ('plan_free', 'FREE', 'Free Plan', 0, 10, 'Basic access with limited credits', true, NOW(), NOW()),
  ('plan_plus', 'PLUS', 'Plus Plan', 9.99, 100, 'Enhanced features with monthly credits', true, NOW(), NOW()),
  ('plan_premium', 'PREMIUM', 'Premium Plan', 29.99, 500, 'Everything with premium support', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert ServiceCreditCost (How many credits each service costs)
-- Columns: id, serviceIdentifier (unique), creditsPerUnit, unitDescription, isActive, createdAt, updatedAt
INSERT INTO "ServiceCreditCost" (id, "serviceIdentifier", "creditsPerUnit", "unitDescription", "isActive", "createdAt", "updatedAt")
VALUES
  ('cost_llm_chat', 'llm_chat_safe', 1, 'Chat message via LLM', true, NOW(), NOW()),
  ('cost_image_generation', 'image_generation', 10, 'Image generation via AI', true, NOW(), NOW()),
  ('cost_story_generation', 'story_generation', 5, 'Story generation via AI', true, NOW(), NOW()),
  ('cost_character_creation', 'character_creation', 5, 'Create new character', true, NOW(), NOW())
ON CONFLICT ("serviceIdentifier") DO NOTHING;

-- Insert Tags (Content categorization)
-- Columns: id, name (unique per type), description, type (enum: CHARACTER, STORY, ASSET, GAME, MEDIA, GENERAL), ageRating (enum: L, TEN, TWELVE, FOURTEEN, SIXTEEN, EIGHTEEN), contentTags (array), originalLanguageCode, weight, searchable, createdAt, updatedAt
INSERT INTO "Tag" (id, name, description, type, "ageRating", weight, searchable, "createdAt", "updatedAt")
VALUES
  -- Character Tags
  ('tag_char_anime', 'anime', 'Anime style characters', 'CHARACTER', 'L', 1, true, NOW(), NOW()),
  ('tag_char_fantasy', 'fantasy', 'Fantasy themed characters', 'CHARACTER', 'L', 1, true, NOW(), NOW()),
  ('tag_char_scifi', 'scifi', 'Science fiction characters', 'CHARACTER', 'L', 1, true, NOW(), NOW()),
  ('tag_char_romance', 'romance', 'Romance oriented characters', 'CHARACTER', 'FOURTEEN', 1, true, NOW(), NOW()),
  ('tag_char_horror', 'horror', 'Horror themed characters', 'CHARACTER', 'SIXTEEN', 1, true, NOW(), NOW()),
  ('tag_char_comedy', 'comedy', 'Comedic characters', 'CHARACTER', 'L', 1, true, NOW(), NOW()),
  ('tag_char_mystery', 'mystery', 'Mystery themed characters', 'CHARACTER', 'TWELVE', 1, true, NOW(), NOW()),
  ('tag_char_adventure', 'adventure', 'Adventure oriented characters', 'CHARACTER', 'L', 1, true, NOW(), NOW()),
  ('tag_char_drama', 'drama', 'Drama centered characters', 'CHARACTER', 'TWELVE', 1, true, NOW(), NOW()),
  ('tag_char_historical', 'historical', 'Historical period characters', 'CHARACTER', 'L', 1, true, NOW(), NOW()),
  ('tag_char_supernatural', 'supernatural', 'Supernatural themed characters', 'CHARACTER', 'FOURTEEN', 1, true, NOW(), NOW()),
  ('tag_char_cyberpunk', 'cyberpunk', 'Cyberpunk aesthetic characters', 'CHARACTER', 'SIXTEEN', 1, true, NOW(), NOW()),

  -- Story Tags
  ('tag_story_short', 'short-story', 'Short story format', 'STORY', 'L', 1, true, NOW(), NOW()),
  ('tag_story_novel', 'novel', 'Novel length story', 'STORY', 'L', 1, true, NOW(), NOW()),
  ('tag_story_serialized', 'serialized', 'Serialized story format', 'STORY', 'L', 1, true, NOW(), NOW()),
  ('tag_story_dark', 'dark', 'Dark themed story', 'STORY', 'SIXTEEN', 1, true, NOW(), NOW()),
  ('tag_story_wholesome', 'wholesome', 'Wholesome content story', 'STORY', 'L', 1, true, NOW(), NOW()),
  ('tag_story_action', 'action', 'Action packed story', 'STORY', 'FOURTEEN', 1, true, NOW(), NOW()),
  ('tag_story_slice_of_life', 'slice-of-life', 'Slice of life story', 'STORY', 'L', 1, true, NOW(), NOW()),
  ('tag_story_tragedy', 'tragedy', 'Tragedy themed story', 'STORY', 'SIXTEEN', 1, true, NOW(), NOW()),
  ('tag_story_comedy_story', 'comedy-story', 'Comedy story format', 'STORY', 'L', 1, true, NOW(), NOW()),
  ('tag_story_philosophical', 'philosophical', 'Philosophical themed story', 'STORY', 'SIXTEEN', 1, true, NOW(), NOW()),

  -- Asset Tags
  ('tag_asset_portrait', 'portrait', 'Portrait format image', 'ASSET', 'L', 1, true, NOW(), NOW()),
  ('tag_asset_landscape', 'landscape', 'Landscape format image', 'ASSET', 'L', 1, true, NOW(), NOW()),
  ('tag_asset_illustration', 'illustration', 'Illustration style asset', 'ASSET', 'L', 1, true, NOW(), NOW()),
  ('tag_asset_fanart', 'fanart', 'Fanart asset', 'ASSET', 'L', 1, true, NOW(), NOW()),
  ('tag_asset_original', 'original', 'Original asset', 'ASSET', 'L', 1, true, NOW(), NOW()),
  ('tag_asset_nsfw', 'nsfw', 'NSFW content asset', 'ASSET', 'EIGHTEEN', 1, true, NOW(), NOW()),
  ('tag_asset_sfw', 'sfw', 'Safe for work asset', 'ASSET', 'L', 1, true, NOW(), NOW())
ON CONFLICT (name, type) DO NOTHING;

-- Log completion
SELECT 'Seed data loaded successfully' AS status;
