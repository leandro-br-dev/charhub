import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const TRANSLATIONS_ROOT = path.resolve(__dirname, '../../translations');
const SOURCE_FOLDER = '_source';

// Cache for discovered namespaces
let cachedNamespaces: string[] | null = null;

/**
 * Discover all available namespaces by scanning the source folder
 */
async function discoverNamespaces(): Promise<string[]> {
  if (cachedNamespaces) {
    return cachedNamespaces;
  }

  const sourceDir = path.join(TRANSLATIONS_ROOT, SOURCE_FOLDER);

  if (!existsSync(sourceDir)) {
    throw new Error(`Source translation folder not found: ${sourceDir}`);
  }

  const files = await fs.readdir(sourceDir);
  cachedNamespaces = files
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''))
    .sort();

  if (cachedNamespaces.length === 0) {
    throw new Error(`No translation files found in ${sourceDir}`);
  }

  return cachedNamespaces;
}

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

async function resolveNamespace(namespace: string): Promise<string> {
  const supportedNamespaces = await discoverNamespaces();

  if (supportedNamespaces.includes(namespace)) {
    return namespace;
  }
  throw Object.assign(new Error(`Unsupported namespace: ${namespace}`), { statusCode: 400 });
}

async function readTranslationFile(language: string, namespace: string): Promise<TranslationFile | null> {
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
  const resolvedNamespace = await resolveNamespace(namespace);
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

    // Fallback to source folder
    const baseFallback = await readTranslationFile(SOURCE_FOLDER, resolvedNamespace);
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

export { discoverNamespaces };
