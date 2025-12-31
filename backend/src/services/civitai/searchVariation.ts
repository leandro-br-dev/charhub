/**
 * Search Variation System for Civitai API
 * Rotates through different search parameters to diversify image results
 */

export interface SearchVariationConfig {
  period: 'Day' | 'Week' | 'Month' | 'Year' | 'AllTime';
  sort: 'Newest' | 'Most Reactions' | 'Most Comments' | 'Trending';
  tag?: string;
}

/**
 * Pool of character-focused tags for Civitai API
 * Tags are in English for better API results
 */
const CHARACTER_TAGS = [
  // Gender/Age
  'woman',
  'man',
  'girl',
  'boy',

  // Fantasy Races
  'elf',
  'dwarf',
  'orc',
  'vampire',
  'demon',
  'angel',

  // Sci-Fi
  'robot',
  'cyborg',
  'android',
  'alien',

  // Classes/Archetypes
  'warrior',
  'mage',
  'wizard',
  'knight',
  'samurai',
  'ninja',
  'pirate',
  'witch',
  'priest',
  'monk',
  'assassin',
  'ranger',

  // Settings/Themes
  'fantasy',
  'sci-fi',
  'cyberpunk',
  'steampunk',
  'medieval',
  'modern',
  'futuristic',

  // Character Types
  'hero',
  'villain',
  'adventurer',
  'explorer',
  'princess',
  'prince',
  'queen',
  'king',
];

/**
 * Periods with weights (how often they should be selected)
 * Higher weight = more frequent
 */
const PERIOD_POOL: Array<{ value: SearchVariationConfig['period']; weight: number }> = [
  { value: 'Day', weight: 20 },      // 20% - Most recent, good for variety
  { value: 'Week', weight: 35 },     // 35% - Good balance of quality and variety
  { value: 'Month', weight: 25 },    // 25% - More content, still relevant
  { value: 'Year', weight: 15 },     // 15% - Large pool, may have older content
  { value: 'AllTime', weight: 5 },   // 5% - Rarely, for classic/popular images
];

/**
 * Sort options with weights
 * Prioritize quality (Most Reactions) over variety (Newest)
 */
const SORT_POOL: Array<{ value: SearchVariationConfig['sort']; weight: number }> = [
  { value: 'Most Reactions', weight: 60 },   // 60% - Prioritize high-quality, popular images
  { value: 'Trending', weight: 25 },         // 25% - Trending content (good balance)
  { value: 'Newest', weight: 15 },           // 15% - Some variety, but not primary
];

/**
 * Get a random item from a weighted pool
 */
function getWeightedRandom<T extends { value: any; weight: number }>(pool: T[]): T['value'] {
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of pool) {
    random -= item.weight;
    if (random <= 0) {
      return item.value;
    }
  }

  return pool[0].value; // Fallback
}

/**
 * Get a random tag from the character tags pool
 */
function getRandomTag(): string {
  return CHARACTER_TAGS[Math.floor(Math.random() * CHARACTER_TAGS.length)];
}

/**
 * Get varied search parameters to avoid repetition
 * Uses weighted random selection for periods and sort orders
 * Rotates through tags to ensure diversity
 */
export function getVariedSearchParams(): SearchVariationConfig {
  const period = getWeightedRandom(PERIOD_POOL);
  const sort = getWeightedRandom(SORT_POOL);
  const tag = getRandomTag();

  return {
    period,
    sort,
    tag,
  };
}

/**
 * Get search parameters with a specific tag
 * Useful when you want to target a specific character type
 */
export function getSearchParamsWithTag(tag: string): SearchVariationConfig {
  const period = getWeightedRandom(PERIOD_POOL);
  const sort = getWeightedRandom(SORT_POOL);

  return {
    period,
    sort,
    tag,
  };
}

/**
 * Get all available character tags
 */
export function getAvailableTags(): string[] {
  return [...CHARACTER_TAGS];
}

/**
 * Validate if a tag exists in our pool
 */
export function isValidTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') {
    return false;
  }
  return CHARACTER_TAGS.includes(tag.toLowerCase());
}
