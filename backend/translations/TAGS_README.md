# Tag System Documentation

This document explains the CharHub tag classification system for categorizing content (characters, stories, assets, etc.).

## 📋 Overview

The tag system allows users to classify and filter content based on:
- **Tag Type**: What the tag classifies (CHARACTER, STORY, ASSET, GAME, MEDIA, GENERAL)
- **Age Rating**: Minimum age requirement (L, TEN, TWELVE, FOURTEEN, SIXTEEN, EIGHTEEN)
- **Content Tags**: Optional content warnings (VIOLENCE, NUDITY, SEXUAL, GORE, etc.)

## 🗂️ File Structure

```
translations/
├── _source/                   ← Master tag definitions (English)
│   ├── tags-character.json    ← Character classification tags
│   ├── tags-story.json        ← Story/narrative tags
│   └── tags-asset.json        ← Asset/visual content tags
├── pt-br/                     ← Translated tags
│   ├── tags-character.json
│   ├── tags-story.json
│   └── tags-asset.json
└── ... (other languages)
```

## 📝 Tag Definition Format

### Source Files (`_source/tags-*.json`)

```json
{
  "description": "Brief description of what tags are in this file",
  "tags": [
    {
      "name": "VTuber",
      "type": "CHARACTER",
      "ageRating": "L",
      "contentTags": [],
      "description": "Virtual YouTuber or content creator"
    },
    {
      "name": "BDSM",
      "type": "CHARACTER",
      "ageRating": "EIGHTEEN",
      "contentTags": ["SEXUAL", "NUDITY"],
      "description": "Bondage, discipline, dominance/submission themes"
    }
  ]
}
```

**Field Descriptions:**
- `name` (string, required): Tag name in English (used for search and database)
- `type` (TagType, required): What this tag classifies
  - `CHARACTER`: Character traits, roles, occupations
  - `STORY`: Story genres, themes
  - `ASSET`: Visual assets, clothing, accessories
  - `GAME`: Game-related tags
  - `MEDIA`: Media types (anime, manga, etc.)
  - `GENERAL`: General classification tags
- `ageRating` (AgeRating, required): Minimum age rating
  - `L`: Livre (All ages) - General audiences
  - `TEN`: 10+ - Mild themes
  - `TWELVE`: 12+ - Moderate themes
  - `FOURTEEN`: 14+ - More mature themes
  - `SIXTEEN`: 16+ - Strong themes, explicit language
  - `EIGHTEEN`: 18+ - Adult content
- `contentTags` (ContentTag[], optional): Content warnings
  - `VIOLENCE`, `GORE`, `SEXUAL`, `NUDITY`, `LANGUAGE`, `DRUGS`, `ALCOHOL`, `HORROR`, `PSYCHOLOGICAL`, `DISCRIMINATION`, `CRIME`, `GAMBLING`
- `description` (string, required): Human-readable description

### Translated Files (`{lang}/tags-*.json`)

```json
{
  "description": "Translated file description",
  "tags": {
    "VTuber": {
      "name": "VTuber",
      "translatedName": "VTuber",
      "translatedDescription": "Criador de conteúdo virtual no YouTube",
      "keptOriginal": true,
      "keepReason": "widely recognized term with no clear translation"
    },
    "Warrior": {
      "name": "Warrior",
      "translatedName": "Guerreiro",
      "translatedDescription": "Personagem voltado para combate",
      "keptOriginal": false
    }
  }
}
```

**Translation Fields:**
- `name` (string): Original English name (same as source)
- `translatedName` (string): Translated name OR original if kept in English
- `translatedDescription` (string): Translated description (always translated)
- `keptOriginal` (boolean): Whether the name was kept in English
- `keepReason` (string, optional): Reason for keeping original name

## 🔧 Translation Philosophy

The tag translation system has special logic for handling technical terms:

### When to Keep English Names

Keep the tag name in English when:
1. **Technical terms**: "VTuber", "LitRPG", "NTR"
2. **Widely recognized borrowed words**: "Anime", "Manga", "Cosplay"
3. **Acronyms**: "BDSM", "MILF", "RPG"
4. **Terms where translation would lose meaning**: "Tsundere", "Yandere", "Kuudere"
5. **No clear equivalent in target language**

### When to Translate Names

Translate the tag name when:
1. **Common words**: "Warrior" → "Guerreiro", "Teacher" → "Professor"
2. **General genres**: "Fantasy" → "Fantasia", "Romance" → "Romance"
3. **Descriptive terms**: "School Uniform" → "Uniforme Escolar"
4. **Clear, widely-used equivalent exists in target language**

### Always Translate Descriptions

Descriptions should **always** be translated, even if the tag name is kept in English. This helps users understand what the tag means.

**Example:**
```json
{
  "name": "VTuber",
  "translatedName": "VTuber",           // Kept in English
  "translatedDescription": "Criador de conteúdo virtual no YouTube",  // Translated
  "keptOriginal": true
}
```

## 🚀 Usage

### 1. Adding New Tags

1. Edit the appropriate source file in `_source/`:
   - `tags-character.json` for character tags
   - `tags-story.json` for story/narrative tags
   - `tags-asset.json` for asset/visual content tags

2. Add your new tag following the format:
   ```json
   {
     "name": "NewTag",
     "type": "CHARACTER",
     "ageRating": "L",
     "contentTags": [],
     "description": "Description of the tag"
   }
   ```

3. Build tag translations:
   ```bash
   npm run build:tags
   ```

4. Seed tags to database:
   ```bash
   # Dry run to preview changes
   npm run db:seed:tags:dry

   # Actually seed the database
   npm run db:seed:tags
   ```

### 2. Updating Existing Tags

1. Edit the tag in the source file (`_source/tags-*.json`)
2. Run the build and seed commands:
   ```bash
   npm run build:tags
   npm run db:seed:tags
   ```

The seed script will automatically update tags that have changed.

### 3. Build Commands

```bash
# Build tag translations (incremental - only updates changed files)
npm run build:tags

# Force rebuild all tag translations
npm run build:tags:force

# Verbose output
npm run build:tags -- -v

# Offline mode (copies English instead of translating)
npm run build:tags -- --offline

# Use specific provider
npm run build:tags -- --provider=openai
npm run build:tags -- --gemini
npm run build:tags -- --grok
```

### 4. Database Seed Commands

```bash
# Seed tags to database
npm run db:seed:tags

# Dry run (preview changes without modifying database)
npm run db:seed:tags:dry

# Verbose output
npm run db:seed:tags -- -v
```

## 📊 Database Schema

Tags are stored in the `Tag` model:

```prisma
model Tag {
  id   String  @id @default(uuid())
  name String  // English name (used for search/filtering)
  type TagType // What this classifies

  ageRating   AgeRating    @default(L)
  contentTags ContentTag[]

  originalLanguageCode String?  // For future use
  weight               Int      @default(1)
  searchable           Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  characters Character[]
  stories    Story[]

  @@unique([name, type])
  @@index([type])
  @@index([ageRating])
  @@index([searchable])
}
```

**Key Points:**
- Tags are stored in **English** in the database
- Translations are only used for display purposes
- Search and filtering always use English tag names
- Same tag name can exist for different types (e.g., "Fantasy" character vs "Fantasy" story)

## 🔍 How It Works

### Search and Filtering

When users search or filter content:
1. Query uses **English tag names** from the database
2. Frontend displays **translated names** to the user
3. This ensures consistent filtering across languages

**Example:**
- Database stores: `"Warrior"`
- Japanese user sees: `"戦士"` (Senshi)
- French user sees: `"Guerrier"`
- All query the same underlying tag: `"Warrior"`

### Age Rating Filter

Users can filter content based on their age rating preference:
```typescript
// Example: Show only content suitable for ages 14+
const tags = await prisma.tag.findMany({
  where: {
    ageRating: {
      in: ['L', 'TEN', 'TWELVE', 'FOURTEEN']
    }
  }
});
```

### Content Tag Filter

Users can block specific content types:
```typescript
// Example: Block content with VIOLENCE or GORE tags
const tags = await prisma.tag.findMany({
  where: {
    contentTags: {
      hasNone: ['VIOLENCE', 'GORE']
    }
  }
});
```

## 🎯 Best Practices

### Tag Naming

1. **Use clear, descriptive names** in English
2. **Be consistent** with similar tags
3. **Avoid abbreviations** unless widely known (OK: "RPG", "BDSM"; Avoid: "Char", "Mag")
4. **Use singular form** when possible (e.g., "Warrior" not "Warriors")

### Age Ratings

1. **Be conservative** - when in doubt, use a higher rating
2. **Consider the content type**, not just the tag name
   - "Vampire" → TWELVE (potential violence)
   - "School Uniform" → L (general content)
3. **Combine with Content Tags** for clarity
   - "Bikini" → FOURTEEN + [NUDITY]
   - "BDSM" → EIGHTEEN + [SEXUAL, NUDITY]

### Content Tags

1. **Use multiple tags** when appropriate
   - "Gladiator" → [VIOLENCE, GORE]
   - "Erotic" → [SEXUAL, NUDITY]
2. **Be specific** about content warnings
3. **Err on the side of disclosure** - it's better to over-tag than under-tag

### Translation Guidelines

1. **Research the term** in the target language before deciding
2. **Ask native speakers** when unsure
3. **Check existing media** (anime/manga databases, game translations) for precedent
4. **Document your reasoning** in `keepReason` when keeping English
5. **Be consistent** across similar terms

## 🔗 Related Files

- `src/scripts/buildTagTranslations.ts` - Tag translation build script
- `src/scripts/seedTags.ts` - Database seeding script
- `src/types/tags.ts` - TypeScript type definitions
- `prisma/schema.prisma` - Database schema

## 📚 Examples

### Example 1: Safe, General Tag

```json
{
  "name": "Maid",
  "type": "CHARACTER",
  "ageRating": "L",
  "contentTags": [],
  "description": "Maid occupation or outfit"
}
```

### Example 2: Violent Content Tag

```json
{
  "name": "Assassin",
  "type": "CHARACTER",
  "ageRating": "SIXTEEN",
  "contentTags": ["VIOLENCE", "CRIME"],
  "description": "Stealth killer character"
}
```

### Example 3: Adult Content Tag

```json
{
  "name": "BDSM",
  "type": "CHARACTER",
  "ageRating": "EIGHTEEN",
  "contentTags": ["SEXUAL", "NUDITY"],
  "description": "Bondage, discipline, dominance/submission themes"
}
```

### Example 4: Technical Term (Keep English)

```json
// Source
{
  "name": "VTuber",
  "type": "CHARACTER",
  "ageRating": "L",
  "contentTags": [],
  "description": "Virtual YouTuber or content creator"
}

// Translation (Portuguese)
{
  "VTuber": {
    "name": "VTuber",
    "translatedName": "VTuber",  // Kept in English
    "translatedDescription": "Criador de conteúdo virtual no YouTube",
    "keptOriginal": true,
    "keepReason": "widely recognized term with no clear translation"
  }
}
```

## 🚨 Important Notes

1. **Never edit translated files manually** - they are auto-generated
2. **Always edit source files** (`_source/tags-*.json`)
3. **Run build after changes** to update translations
4. **Test with dry run** before seeding to database
5. **Database uses English names** - translations are for display only
6. **Same tag name can exist for different types** but must be unique within a type
