# Translation System

This directory contains all translation files for the CharHub platform.

## 📁 Directory Structure

```
translations/
├── _source/          ← Master translation files (English)
│   ├── common.json
│   ├── chat.json
│   └── ...
├── pt-br/           ← Portuguese (Brazil) translations
├── es-es/           ← Spanish translations
├── fr-fr/           ← French translations
└── ...              (other languages)
```

## 🔧 How It Works

### 1. **Source Files (`_source/` folder)**

The `_source/` folder contains the **master translation files** in English. This is where you add new translation keys.

**Important:** Only edit files in `_source/`. Never manually edit translated files (pt-br, es-es, etc.) as they are auto-generated.

### 2. **Auto-Discovery of Namespaces**

The system automatically discovers all namespaces by scanning `_source/*.json` files. No need to manually update configuration when adding new translation files.

### 3. **Smart Incremental Builds**

The translation build system uses file modification timestamps to detect changes:

- ✅ **If source file is newer** → Regenerates translation
- ✅ **If translation is up-to-date** → Skips (no API call)
- ✅ **If translation is invalid** → Regenerates

This means builds are **super fast** when nothing changed (< 1 second vs 90 seconds).

## 🚀 Usage

### Adding a New Translation Key

1. Open the appropriate file in `_source/` (e.g., `_source/chat.json`)
2. Add your new key:
   ```json
   {
     "description": "Chat and conversation interface translations",
     "resources": {
       "newFeature": {
         "title": "New Feature",
         "description": "This is a new feature"
       }
     }
   }
   ```
3. Run the build command:
   ```bash
   npm run build:translations
   ```
4. The system will automatically translate to all 11 languages

### Creating a New Namespace

1. Create a new file in `_source/` (e.g., `_source/settings.json`):
   ```json
   {
     "description": "Settings page translations",
     "resources": {
       "title": "Settings",
       "save": "Save Changes"
     }
   }
   ```
2. Run `npm run build:translations`
3. That's it! The namespace is automatically discovered and translated

## 📊 Build Commands

```bash
# Build all translations (incremental - only updates changed files)
npm run build:translations

# Force rebuild everything (ignores timestamps)
npm run build:translations -- --force

# Verbose output (shows what's being skipped/updated)
npm run build:translations -- -v

# Offline mode (copies English instead of translating)
npm run build:translations -- --offline
```

## 🌍 Supported Languages

- Portuguese (Brazil) - `pt-BR`
- Spanish - `es-ES`
- French - `fr-FR`
- German - `de-DE`
- Simplified Chinese - `zh-CN`
- Hindi - `hi-IN`
- Arabic - `ar-SA`
- Russian - `ru-RU`
- Japanese - `ja-JP`
- Korean - `ko-KR`
- Italian - `it-IT`

## 🎯 Performance

**Before optimization:**
- 143 API requests (11 languages × 13 namespaces)
- ~90 seconds build time
- Frequent rate limit errors (60 req/min limit)

**After optimization:**
- **Incremental builds:** 0 API requests when nothing changed (~0.5s)
- **Full rebuild:** 143 requests only when needed (~90s)
- **Partial update:** Only changed files are retranslated

## 🔍 How Detection Works

```typescript
// Pseudocode
if (source_file.mtime > translated_file.mtime) {
  // Source was modified → retranslate
  await translateNamespace(language, namespace);
} else if (!isValidStructure(translated_file)) {
  // Translation is corrupted → retranslate
  await translateNamespace(language, namespace);
} else {
  // Skip - already up to date
  console.log('✓ namespace - up to date');
}
```

## 📝 Translation File Format

Each translation file follows this structure:

```json
{
  "description": "Brief description of what this namespace contains",
  "resources": {
    "key1": "Translated value",
    "nested": {
      "key2": "Another value"
    }
  }
}
```

**Rules:**
- Keep placeholders intact: `{{name}}`, `{{count}}`, etc.
- Maintain the same JSON structure across all languages
- Only translate the **values**, never the **keys**

## 🚨 Troubleshooting

### "Source file not found" error
- Make sure your file exists in `_source/` folder
- File must have `.json` extension

### Translations not updating
- Make sure you're editing files in `_source/`, not in language folders
- Run `npm run build:translations` after making changes
- Use `--force` flag to force rebuild: `npm run build:translations -- --force`

### Rate limit errors
- The incremental build should prevent this
- If it happens, wait a few minutes and try again
- Use `--offline` mode as temporary workaround

## 🔗 Related Files

- `src/scripts/buildTranslations.ts` - Build script
- `src/services/translationService.ts` - Runtime translation loader
- `src/routes/v1/i18n.ts` - API endpoints for frontend
