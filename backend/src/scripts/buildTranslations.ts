import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import { callLLM } from '../services/llm';
import type { LLMProvider } from '../services/llm';

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../../.env') });

const TRANSLATIONS_ROOT = path.resolve(__dirname, '../../translations');
const BASE_LANGUAGE = 'en';

// Supported namespaces - must match translationService.ts
const SUPPORTED_NAMESPACES = [
  'common',
  'home',
  'login',
  'signup',
  'callback',
  'dashboard',
  'notFound',
  'legal',
  'characters',
  'navigation',
  'profile',
  'chat',
  'imageGallery'
] as const;
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

CRITICAL RULES:
- Keep the JSON structure and keys EXACTLY identical
- Translate ONLY the values, never the keys
- Preserve placeholders like {{provider}}, {{name}}, etc. exactly as they are
- Maintain the same level of formality and tone
- Use natural, idiomatic expressions in the target language
- Respond with ONLY valid JSON - no explanations, no markdown fences, no comments
- IMPORTANT: Ensure all strings are properly quoted and escaped
- IMPORTANT: Do not truncate the response - translate ALL content completely
- If a string contains quotes, escape them with backslash: \\"

Context: ${description}

JSON to translate:
${jsonContent}

Remember: Your response must be valid JSON that can be parsed by JSON.parse(). Double-check that all strings are properly closed with quotes.`;
}

function parseModelResponse(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch (error) {
    // Try to fix common LLM JSON errors
    let fixed = cleaned;

    // Remove trailing commas before closing braces/brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Try to fix unterminated strings by finding the last complete quote
    const lines = fixed.split('\n');
    const fixedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const quoteCount = (line.match(/"/g) || []).length;

      // If odd number of quotes, line has unterminated string
      if (quoteCount % 2 !== 0) {
        // Try to complete the string by adding a quote before any trailing comma or brace
        fixedLines.push(line.replace(/([^"])(\s*[,}\]])$/, '$1"$2'));
      } else {
        fixedLines.push(line);
      }
    }

    fixed = fixedLines.join('\n');

    try {
      return JSON.parse(fixed) as Record<string, unknown>;
    } catch (retryError) {
      console.error('Failed to parse JSON even after fixes:');
      console.error('Original error:', error);
      console.error('First 500 chars of response:', cleaned.substring(0, 500));
      console.error('Last 500 chars of response:', cleaned.substring(Math.max(0, cleaned.length - 500)));
      throw new Error(`Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
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
  const model = options.model ?? 'gemini-2.5-flash-lite';

  if (options.verbose) {
    console.log(`  🤖 Generating with ${provider}/${model}...`);
  }

  const prompt = buildPrompt(language, baseFile);

  // Calculate estimated output size (input size * 1.5 for translation expansion)
  const estimatedOutputTokens = Math.ceil((JSON.stringify(baseFile.resources).length / 4) * 1.5);
  const maxOutputTokens = Math.max(8192, Math.min(estimatedOutputTokens, 32768));

  // Retry logic for handling LLM errors
  let lastError: Error | null = null;
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (options.verbose && attempt > 1) {
        console.log(`  🔄 Retry attempt ${attempt}/${maxRetries}...`);
      }

      const response = await callLLM({
        provider,
        model,
        userPrompt: prompt,
        maxTokens: maxOutputTokens,
      });

      const resources = parseModelResponse(response.content);

      // Validate that we got a proper translation
      if (Object.keys(resources).length === 0) {
        throw new Error('LLM returned empty object');
      }

      // Write translation file
      const translationFile: TranslationFile = {
        description: baseFile.description,
        resources,
      };

      await writeTranslationFile(normalizedLanguage, namespace, translationFile);
      return resources;
    } catch (error) {
      lastError = error as Error;
      console.warn(`  ⚠️  Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError || new Error('Translation failed after retries');
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
