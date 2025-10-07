import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { callLLM } from '../services/llm';
import type { LLMProvider } from '../services/llm';

const TRANSLATIONS_ROOT = path.resolve(__dirname, '../../translations');
const BASE_LANGUAGE = 'en';

// Supported namespaces - must match translationService.ts
const SUPPORTED_NAMESPACES = ['common', 'home', 'login', 'signup', 'callback', 'dashboard', 'notFound'] as const;
type Namespace = (typeof SUPPORTED_NAMESPACES)[number];

// Target languages to build
const TARGET_LANGUAGES = [
  'pt-BR',
  'es-ES',
  'fr-FR',
  'de-DE',
  'zh-CN',
  'hi-IN',
  'ar-SA',
  'ru-RU',
  'ja-JP',
  'ko-KR',
  'it-IT',
] as const;

type TranslationFile = {
  description: string;
  resources: Record<string, unknown>;
};

interface BuildOptions {
  provider?: LLMProvider;
  model?: string;
  force?: boolean;
  verbose?: boolean;
  offline?: boolean;
}

type TranslationMode = 'remote' | 'offline';

type ProviderCredentialCheck = {
  provider: LLMProvider;
  missing: boolean;
  envVar: string;
};

function normalizeLanguage(language: string): string {
  return language.toLowerCase();
}

function getProvider(options: BuildOptions): LLMProvider {
  if (options.provider) {
    return options.provider;
  }

  return 'gemini';
}

function getCredentialCheck(provider: LLMProvider): ProviderCredentialCheck {
  switch (provider) {
    case 'gemini':
      return { provider, missing: !process.env.GEMINI_API_KEY, envVar: 'GEMINI_API_KEY' };
    case 'openai':
      return { provider, missing: !process.env.OPENAI_API_KEY, envVar: 'OPENAI_API_KEY' };
    case 'grok':
      return { provider, missing: !process.env.GROK_API_KEY, envVar: 'GROK_API_KEY' };
    default:
      return { provider, missing: true, envVar: 'UNKNOWN' };
  }
}

function resolveTranslationMode(options: BuildOptions): { mode: TranslationMode; reason?: string } {
  if (options.offline) {
    return { mode: 'offline', reason: 'offline flag supplied' };
  }

  const provider = getProvider(options);
  const credentialCheck = getCredentialCheck(provider);

  if (credentialCheck.missing) {
    return {
      mode: 'offline',
      reason: `${credentialCheck.envVar} not configured – falling back to English copy`,
    };
  }

  return { mode: 'remote' };
}

async function readTranslationFile(language: string, namespace: Namespace): Promise<TranslationFile | null> {
  const filePath = path.join(TRANSLATIONS_ROOT, language, `${namespace}.json`);
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as TranslationFile;
}

async function writeTranslationFile(language: string, namespace: Namespace, data: TranslationFile): Promise<void> {
  const dir = path.join(TRANSLATIONS_ROOT, language);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${namespace}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function buildPrompt(targetLanguage: string, base: TranslationFile): string {
  const description = base.description ?? 'Translation context for UI strings.';
  const jsonContent = JSON.stringify(base.resources, null, 2);

  const languageNames: Record<string, string> = {
    'pt-br': 'Brazilian Portuguese',
    'es-es': 'Spanish',
    'fr-fr': 'French',
    'de-de': 'German',
    'zh-cn': 'Simplified Chinese',
    'hi-in': 'Hindi',
    'ar-sa': 'Arabic',
    'ru-ru': 'Russian',
    'ja-jp': 'Japanese',
    'ko-kr': 'Korean',
    'it-it': 'Italian',
  };

  const langName = languageNames[normalizeLanguage(targetLanguage)] || targetLanguage;

  return `You are a professional localization assistant. Translate the JSON values from English to ${langName}.

IMPORTANT RULES:
- Keep the JSON structure and keys EXACTLY identical
- Translate ONLY the values, never the keys
- Preserve placeholders like {{provider}}, {{name}}, etc. exactly as they are
- Maintain the same level of formality and tone
- Use natural, idiomatic expressions in the target language
- Respond with ONLY the translated JSON, no explanations or markdown

Context: ${description}

JSON to translate:
${jsonContent}`;
}

function parseModelResponse(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function getResourceKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getResourceKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys.sort();
}

function compareKeys(baseKeys: string[], translatedKeys: string[]): { missing: string[]; extra: string[] } {
  const missing = baseKeys.filter(key => !translatedKeys.includes(key));
  const extra = translatedKeys.filter(key => !baseKeys.includes(key));
  return { missing, extra };
}

async function validateTranslation(language: string, namespace: Namespace): Promise<boolean> {
  const baseFile = await readTranslationFile(BASE_LANGUAGE, namespace);
  const translatedFile = await readTranslationFile(language, namespace);

  if (!baseFile || !translatedFile) {
    return false;
  }

  const baseKeys = getResourceKeys(baseFile.resources);
  const translatedKeys = getResourceKeys(translatedFile.resources);

  const { missing, extra } = compareKeys(baseKeys, translatedKeys);

  if (missing.length > 0 || extra.length > 0) {
    console.log(`  ⚠️  Validation failed for ${language}/${namespace}:`);
    if (missing.length > 0) {
      console.log(`     Missing keys: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      console.log(`     Extra keys: ${extra.join(', ')}`);
    }
    return false;
  }

  return true;
}

async function writeOfflineFallback(
  language: string,
  namespace: Namespace,
  baseFile: TranslationFile,
  options: BuildOptions
): Promise<void> {
  if (options.verbose) {
    console.log(`  💤 Offline mode - copying English resources for ${language}/${namespace}`);
  }

  await writeTranslationFile(language, namespace, {
    description: baseFile.description,
    resources: baseFile.resources,
  });
}

async function generateTranslation(
  language: string,
  namespace: Namespace,
  options: BuildOptions
): Promise<Record<string, unknown>> {
  const baseFile = await readTranslationFile(BASE_LANGUAGE, namespace);
  if (!baseFile) {
    throw new Error(`Base translation for namespace "${namespace}" not found.`);
  }

  const normalizedLanguage = normalizeLanguage(language);
  const { mode, reason } = resolveTranslationMode(options);

  if (mode === 'offline') {
    if (reason) {
      console.log(`  ⚠️  ${normalizedLanguage}/${namespace}: ${reason}`);
    }
    await writeOfflineFallback(normalizedLanguage, namespace, baseFile, options);
    return baseFile.resources;
  }

  const provider = getProvider(options);
  const model = options.model ?? 'gemini-2.5-flash';

  if (options.verbose) {
    console.log(`  🤖 Generating with ${provider}/${model}...`);
  }

  const prompt = buildPrompt(language, baseFile);
  const response = await callLLM({
    provider,
    model,
    userPrompt: prompt,
  });

  const resources = parseModelResponse(response.content);

  const translationFile: TranslationFile = {
    description: baseFile.description,
    resources,
  };

  await writeTranslationFile(normalizedLanguage, namespace, translationFile);
  return resources;
}

async function buildNamespace(
  language: string,
  namespace: Namespace,
  options: BuildOptions
): Promise<void> {
  const normalizedLang = normalizeLanguage(language);

  const exists = await readTranslationFile(normalizedLang, namespace);

  if (exists && !options.force) {
    const isValid = await validateTranslation(normalizedLang, namespace);

    if (isValid) {
      if (options.verbose) {
        console.log(`  ✓ ${namespace} - already valid`);
      }
      return;
    }

    console.log(`  🔄 ${namespace} - invalid, regenerating...`);
  } else if (options.force) {
    console.log(`  🔄 ${namespace} - force rebuild...`);
  } else {
    console.log(`  ➕ ${namespace} - creating...`);
  }

  await generateTranslation(normalizedLang, namespace, options);
  console.log(`  ✓ ${namespace} - done`);
}

async function buildLanguage(language: string, options: BuildOptions): Promise<void> {
  console.log(`\n📦 Building ${language}...`);

  for (const namespace of SUPPORTED_NAMESPACES) {
    await buildNamespace(language, namespace, options);
  }

  console.log(`✅ ${language} complete`);
}

async function buildAllTranslations(options: BuildOptions = {}): Promise<void> {
  const provider = getProvider(options);
  const { mode, reason } = resolveTranslationMode(options);

  console.log('🌍 Building translations...\n');
  console.log(`Mode: ${mode.toUpperCase()}`);
  if (reason) {
    console.log(`Reason: ${reason}`);
  }
  console.log(`Base language: ${BASE_LANGUAGE}`);
  console.log(`Target languages: ${TARGET_LANGUAGES.join(', ')}`);
  console.log(`Namespaces: ${SUPPORTED_NAMESPACES.join(', ')}\n`);
  console.log(`Provider: ${provider}\n`);

  const startTime = Date.now();

  for (const language of TARGET_LANGUAGES) {
    try {
      await buildLanguage(language, options);
    } catch (error) {
      console.error(`❌ Failed to build ${language}:`, error);
      if (!options.force) {
        throw error;
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 All translations built successfully in ${duration}s`);
}

function parseProviderArgument(args: string[]): LLMProvider | undefined {
  const providerFlag = args.find(arg => arg.startsWith('--provider='));
  if (providerFlag) {
    const value = providerFlag.split('=')[1] as LLMProvider | undefined;
    if (value && ['gemini', 'openai', 'grok'].includes(value)) {
      return value;
    }
  }

  if (args.includes('--openai')) {
    return 'openai';
  }

  if (args.includes('--grok')) {
    return 'grok';
  }

  if (args.includes('--gemini')) {
    return 'gemini';
  }

  return undefined;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: BuildOptions = {
    force: args.includes('--force'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    provider: parseProviderArgument(args) ?? 'gemini',
    offline: args.includes('--offline') || process.env.TRANSLATIONS_OFFLINE === 'true',
  };

  buildAllTranslations(options)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Build failed:', error);
      process.exit(1);
    });
}

export { buildAllTranslations, buildLanguage, buildNamespace };