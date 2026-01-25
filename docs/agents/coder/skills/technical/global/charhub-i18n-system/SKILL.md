---
name: charhub-i18n-system
description: Internationalization (i18n) system for CharHub React frontend. Use when adding translations, working with i18n in React components, or preparing for future API i18n implementation.
---

# CharHub i18n System

## Purpose

Define internationalization patterns and standards for CharHub React frontend with react-i18next.

## Current State

**Frontend**: Fully implemented with react-i18next
**Backend**: Hardcoded English strings (planned for i18n - see #129)

---

## Frontend i18n (React)

### Translation Files Location

```
frontend/src/locales/
├── en-US.json    # English (United States)
└── pt-BR.json    # Portuguese (Brazilian)
```

### Key Structure (Flat Format Recommended)

```json
{
  "common": {
    "submit": "Submit",
    "cancel": "Cancel",
    "delete": "Delete",
    "save": "Save",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "components": {
    "characterCard": {
      "viewDetails": "View Details",
      "edit": "Edit",
      "delete": "Delete",
      "noCharacters": "No characters found"
    },
    "characterForm": {
      "firstName": "First Name",
      "lastName": "Last Name",
      "description": "Description",
      "save": "Save Character",
      "cancel": "Cancel"
    }
  },
  "pages": {
    "characterList": {
      "title": "Characters",
      "createNew": "Create New Character",
      "searchPlaceholder": "Search characters..."
    },
    "characterDetail": {
      "title": "Character Details",
      "notFound": "Character not found",
      "backToList": "Back to List"
    }
  },
  "api": {
    "errors": {
      "unauthorized": "Unauthorized access",
      "forbidden": "You don't have permission",
      "notFound": "Resource not found",
      "serverError": "Server error occurred",
      "networkError": "Network error"
    }
  }
}
```

### Usage in React Components

#### Setup i18next

```typescript
// i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en-US',
    lng: 'en-US',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
```

#### Translation Hook

```typescript
import { useTranslation } from 'react-i18next';

function CharacterCard() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      {/* Simple key */}
      <button>{t('common.submit')}</button>

      {/* Nested key */}
      <span>{t('components.characterCard.edit')}</span>

      {/* With interpolation */}
      <p>{t('pages.characterDetail.greeting', { name: character.name })}</p>

      {/* Change language */}
      <button onClick={() => i18n.changeLanguage('pt-BR')}>
        Português
      </button>
    </div>
  );
}
```

#### Translation with Parameters

**Translation file**:
```json
{
  "character": {
    "greeting": "Hello, {name}!",
    "count": "You have {count} characters"
  }
}
```

**Component usage**:
```typescript
const { t } = useTranslation();

// Interpolation
<p>{t('character.greeting', { name: user.name })}</p>

<p>{t('character.count', { count: characterCount })}</p>
```

#### Pluralization

```typescript
// In translation file:
// "character_count_one": "You have {{count}} character"
// "character_count_other": "You have {{count}} characters"

const { t } = useTranslation();

<p>
  {t('character_count', { count: characterCount })}
</p>
```

### Trans Component

```typescript
import { Trans } from 'react-i18next';

function WelcomeMessage() {
  return (
    <Trans i18nKey="welcomeMessage">
      Welcome <strong>{{ name }}</strong>!
    </Trans>
  );
}
```

### Language Switching

```typescript
function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Save preference to localStorage (auto-detected)
  };

  return (
    <div>
      <button onClick={() => changeLanguage('en-US')}>English</button>
      <button onClick={() => changeLanguage('pt-BR')}>Português</button>
    </div>
  );
}
```

### Date/Number Formatting

```typescript
import { useTranslation } from 'react-i18next';

function Profile() {
  const { t, i18n } = useTranslation();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  return (
    <div>
      <p>{formatDate(new Date())}</p>
      <p>{formatNumber(1234.56)}</p>
    </div>
  );
}
```

---

## Adding New Translations

### CRITICAL Rules

**1. ALWAYS add to BOTH languages**:
```json
// en-US.json
{
  "newFeature": {
    "title": "New Feature",
    "description": "Description here"
  }
}

// pt-BR.json - MUST ADD TOO
{
  "newFeature": {
    "title": "Novo Recurso",
    "description": "Descrição aqui"
  }
}
```

**2. No compilation step needed**:
```bash
# No need for translations:compile like Vue
# react-i18next loads translations dynamically
```

**3. Verify frontend builds**:
```bash
npm run build
```

### Translation Key Naming

**Use descriptive, hierarchical names**:

```json
// ✅ GOOD - Clear and hierarchical
{
  "userProfile": {
    "title": "User Profile",
    "sections": {
      "personal": "Personal Information",
      "security": "Security Settings"
    }
  }
}

// ❌ BAD - Generic and flat
{
  "text1": "User Profile",
  "text2": "Personal Information",
  "text3": "Security Settings"
}
```

---

## Backend i18n (Planned)

### Current Pattern (To Be Replaced)

```typescript
// ❌ Current - Hardcoded English
throw new ForbiddenException('Admin access required');
throw new NotFoundException('Character not found');
throw new BadRequestException('Invalid input data');
```

### Future Pattern (Planned - #129)

```typescript
// ✅ Future - With i18n support
import { apiT } from '../utils/api-i18n';

// Get translated message based on request locale
const message = await apiT(req, 'api.error.admin_required');
throw new ForbiddenException(message);

const notFoundMessage = await apiT(req, 'api.error.character_not_found');
throw new NotFoundException(notFoundMessage);
```

### Backend Translation Structure (Planned)

```
backend/src/locales/
├── en-US.json
└── pt-BR.json
```

**Content structure**:
```json
{
  "api": {
    "error": {
      "admin_required": "Admin access required",
      "character_not_found": "Character not found",
      "invalid_input": "Invalid input data: {{field}}"
    },
    "success": {
      "character_created": "Character created successfully",
      "character_updated": "Character updated successfully"
    }
  }
}
```

---

## Common Mistakes

### ❌ DON'T: Hardcode User-Facing Text

```typescript
// ❌ BAD - Hardcoded English
<button>Submit</button>
<span>Error occurred</span>
```

### ❌ DON'T: Add to Only One Language

```json
// en-US.json
{
  "newButton": "New Button"
}

// pt-BR.json - FORGOT TO ADD!
```

### ❌ DON'T: Use Generic Key Names

```json
{
  "label1": "Submit",
  "label2": "Cancel",
  "text1": "Error"
}
```

### ✅ DO: Always Use i18n

```typescript
// ✅ GOOD - i18n keys
<button>{t('common.submit')}</button>
<span>{t('api.errors.serverError')}</span>
```

### ✅ DO: Add to Both Languages

```json
// en-US.json AND pt-BR.json
{
  "newButton": "New Button"  // en-US
}

{
  "newButton": "Novo Botão"  // pt-BR
}
```

### ✅ DO: Use Descriptive Key Names

```json
{
  "common": {
    "submit": "Submit",
    "cancel": "Cancel"
  },
  "characterForm": {
    "saveButton": "Save Character"
  }
}
```

---

## Translation Workflow

### When Adding New Feature with UI

1. **Implement component** with i18n keys from start
2. **Add keys** to BOTH `en-US.json` and `pt-BR.json`
3. **Test** both languages in browser
4. **Verify** translations display correctly

### When Modifying Existing Translation

1. **Update** translation in BOTH language files
2. **Test** in browser to confirm change
3. **Commit** both files together

---

## Best Practices Summary

| Do | Don't |
|-----|--------|
| Use i18n for ALL user-facing text | Hardcode strings in components |
| Add to BOTH en-US and pt-BR | Add to only one language |
| Use descriptive, hierarchical keys | Use generic names (text1, label2) |
| Test both languages | Test only English |
| Use interpolation for dynamic values | Concatenate strings manually |
| Use useTranslation hook | Import t directly |

---

## Related Skills

- `charhub-react-patterns` - React i18n integration
- `charhub-react-component-patterns` - Component i18n patterns
- `charhub-api-conventions` - API i18n (future implementation)
