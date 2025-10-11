import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const TRANSLATIONS_ROOT = path.resolve(__dirname, '../../translations');
const BASE_LANGUAGE = 'en';
const SUPPORTED_NAMESPACES = ['common', 'home', 'login', 'signup', 'callback', 'dashboard', 'notFound', 'legal', 'characters', 'navigation', 'profile'] as const;
type Namespace = (typeof SUPPORTED_NAMESPACES)[number];

type TranslationFile = {
  description: string;
  resources: Record<string, unknown>;
};

function normalizeLanguage(language: string): string {
  return language.toLowerCase();
}

function languageCandidates(language: string): string[] {
  const normalized = normalizeLanguage(language);
  if (!normalized.includes('-')) {
    return [normalized];
  }
  const [base] = normalized.split('-');
  return [normalized, base];
}

function resolveNamespace(namespace: string): Namespace {
  if ((SUPPORTED_NAMESPACES as readonly string[]).includes(namespace)) {
    return namespace as Namespace;
  }
  throw Object.assign(new Error(`Unsupported namespace: ${namespace}`), { statusCode: 400 });
}

async function readTranslationFile(language: string, namespace: Namespace): Promise<TranslationFile | null> {
  for (const candidate of languageCandidates(language)) {
    const filePath = path.join(TRANSLATIONS_ROOT, candidate, `${namespace}.json`);
    if (existsSync(filePath)) {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw) as TranslationFile;
    }
  }
  return null;
}

/**
 * Loads translation resources from static files.
 * Translations should be pre-built using npm run build:translations
 */
export async function getTranslationResources(language: string, namespace: string): Promise<Record<string, unknown>> {
  const resolvedNamespace = resolveNamespace(namespace);
  const normalizedLang = normalizeLanguage(language);

  try {
    // Try exact language match first
    const exactMatch = await readTranslationFile(normalizedLang, resolvedNamespace);
    if (exactMatch) {
      return exactMatch.resources as Record<string, unknown>;
    }

    // Try language prefix (e.g., 'pt-br' -> 'pt')
    const candidates = languageCandidates(normalizedLang);
    for (const candidate of candidates) {
      const file = await readTranslationFile(candidate, resolvedNamespace);
      if (file) {
        return file.resources as Record<string, unknown>;
      }
    }

    // Fallback to base language
    const baseFallback = await readTranslationFile(BASE_LANGUAGE, resolvedNamespace);
    if (baseFallback) {
      return baseFallback.resources as Record<string, unknown>;
    }

    throw Object.assign(
      new Error(`Translation not found for ${language}/${namespace}. Run 'npm run build:translations' to generate translations.`),
      { statusCode: 404 }
    );
  } catch (error) {
    if ((error as any).statusCode) {
      throw error;
    }
    throw Object.assign(new Error('Failed to load translation'), { cause: error, statusCode: 500 });
  }
}

export { SUPPORTED_NAMESPACES };
