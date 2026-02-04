import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { systemConfigService } from '../../../services';
import { llmCatalogService } from '../../../services/llmCatalog';
import type { LLMModelInfo } from '../../../services/llmCatalog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/Input';
import Switch from '../../../components/ui/switch';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Select } from '../../../components/ui/Select';
import { Link } from 'react-router-dom';

// Fixed configuration fields definition
interface ConfigField {
  key: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  selectOptionsKey?: string; // Key for translation-based select options
}

// Fixed sections with their fields (labels and descriptions come from translations)
const SECTIONS: Record<string, ConfigField[]> = {
  translation: [
    { key: 'translation.default_provider', type: 'select' },
    { key: 'translation.default_model', type: 'select' },
    { key: 'translation.cache_ttl', type: 'number' },
    { key: 'translation.enable_pre_translation', type: 'boolean' },
  ],
  context: [
    { key: 'context.max_tokens', type: 'number' },
  ],
  generation: [
    { key: 'generation.daily_limit', type: 'number' },
    { key: 'generation.batch_enabled', type: 'boolean' },
    { key: 'generation.batch_size_per_run', type: 'number' },
    { key: 'generation.batch_retry_attempts', type: 'number' },
    { key: 'generation.batch_timeout_minutes', type: 'number' },
  ],
  correction: [
    { key: 'correction.avatar_daily_limit', type: 'number' },
    { key: 'correction.data_daily_limit', type: 'number' },
  ],
  curation: [
    { key: 'curation.search_keywords', type: 'text' },
    { key: 'curation.anime_model_ids', type: 'text' },
    { key: 'curation.auto_approval_threshold', type: 'number' },
    { key: 'curation.require_manual_review', type: 'boolean' },
  ],
  moderation: [
    { key: 'moderation.nsfw_filter_enabled', type: 'boolean' },
    { key: 'moderation.nsfw_filter_strictness', type: 'select', selectOptionsKey: 'strictness' },
  ],
  scheduling: [
    { key: 'scheduling.daily_curation_hour', type: 'number' },
  ],
};

// Helper function to get section and field name from key
function parseConfigKey(key: string): { section: string; field: string } {
  const [section, ...fieldParts] = key.split('.');
  return { section, field: fieldParts.join('_') };
}

interface ConfigValue {
  key: string;
  value: string;
}

export default function SystemConfigPage(): JSX.Element {
  const { t } = useTranslation(['systemConfig', 'navigation', 'common']);
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configs, setConfigs] = useState<ConfigValue[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, string | boolean>>({});
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

  // LLM Catalog data for model selection
  const [llmProviders, setLLMProviders] = useState<string[]>([]);
  const [llmModels, setLLMModels] = useState<LLMModelInfo[]>([]);

  // Load configurations
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load configs
        const configResponse = await systemConfigService.getAll();
        const configList = configResponse?.configs || [];
        setConfigs(configList);

        // Initialize local values
        const initialValues: Record<string, string | boolean> = {};
        configList.forEach((config: ConfigValue) => {
          initialValues[config.key] = config.value;
        });
        setLocalValues(initialValues);

        // Load LLM catalog
        const [providers, models] = await Promise.all([
          llmCatalogService.getProviders(),
          llmCatalogService.getAll(),
        ]);
        setLLMProviders(providers);
        setLLMModels(models);
      } catch (error) {
        console.error('[SystemConfigPage] Failed to load configurations:', error);
        addToast(t('systemConfig:messages.loadError'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [t, addToast]);

  // Get display name for provider
  const getProviderDisplayName = (provider: string): string => {
    const providerMap: Record<string, string> = {
      gemini: 'Google Gemini',
      openai: 'OpenAI',
      grok: 'Grok (xAI)',
      anthropic: 'Anthropic Claude',
    };
    return providerMap[provider] || provider;
  };

  // Get models for selected provider
  const getModelsForProvider = (provider: string): LLMModelInfo[] => {
    return llmModels.filter(m => m.provider === provider);
  };

  // Handle value change
  const handleValueChange = (key: string, value: string | boolean) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setChangedKeys(prev => new Set(prev).add(key));
  };

  // Handle provider change - clear related model
  const handleProviderChange = (key: string, newProvider: string) => {
    handleValueChange(key, newProvider);
    // Clear the model value if provider changes
    const modelKey = 'translation.default_model';
    if (key === 'translation.default_provider' && localValues[modelKey]) {
      handleValueChange(modelKey, '');
    }
  };

  // Save all changes
  const handleSaveAll = async () => {
    if (changedKeys.size === 0) return;

    try {
      setIsSaving(true);

      const updates = Array.from(changedKeys).map(async (key) => {
        const value = localValues[key];
        const apiValue = typeof value === 'boolean' ? String(value) : value;
        return systemConfigService.updateConfig(key, apiValue);
      });

      await Promise.all(updates);

      addToast(t('systemConfig:messages.saveSuccess', { key: 'All configurations' }), 'success');
      setChangedKeys(new Set());
    } catch (error) {
      console.error('[SystemConfigPage] Failed to save configurations:', error);
      addToast(t('systemConfig:messages.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Render a field based on its type
  const renderField = (section: string, field: ConfigField) => {
    const value = localValues[field.key] ?? '';
    const hasChanged = changedKeys.has(field.key);

    // Get label and description from translations
    const { section: sectionName, field: fieldName } = parseConfigKey(field.key);
    const label = t(`systemConfig:fields.${sectionName}.${fieldName}.label`);
    const description = t(`systemConfig:fields.${sectionName}.${fieldName}.description`);

    // Get select options from translations if selectOptionsKey is provided
    const getSelectOptions = (): { value: string; label: string }[] => {
      if (field.selectOptionsKey) {
        const options = t(`systemConfig:${field.selectOptionsKey}`, { returnObjects: true }) as Record<string, string>;
        return Object.entries(options).map(([value, label]) => ({ value, label: String(label) }));
      }
      return [];
    };

    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex-1">
              <label className="text-sm font-medium text-content">{label}</label>
              <p className="text-xs text-muted mt-0.5">{description}</p>
            </div>
            <Switch
              checked={value as boolean}
              onChange={(checked) => handleValueChange(field.key, checked)}
              size="medium"
              disabled={isSaving}
            />
          </div>
        );

      case 'select':
        if (field.key === 'translation.default_provider') {
          // LLM Provider select with dynamic options
          const providerOptions = llmProviders.map(p => ({
            value: p,
            label: getProviderDisplayName(p),
          }));

          return (
            <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex-1">
                <label className="text-sm font-medium text-content">{label}</label>
                <p className="text-xs text-muted mt-0.5">{description}</p>
              </div>
              <Select
                options={providerOptions}
                value={value as string}
                onChange={(val) => handleProviderChange(field.key, val)}
                placeholder="Select provider..."
                disabled={isSaving}
                className="max-w-xs"
              />
            </div>
          );
        }

        if (field.key === 'translation.default_model') {
          // LLM Model select - filtered by selected provider
          const selectedProvider = localValues['translation.default_provider'] as string;
          const filteredModels = selectedProvider ? getModelsForProvider(selectedProvider) : [];
          const modelOptions = filteredModels.map(m => ({
            value: m.name,
            label: m.displayName,
          }));

          return (
            <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex-1">
                <label className="text-sm font-medium text-content">{label}</label>
                <p className="text-xs text-muted mt-0.5">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  options={modelOptions}
                  value={value as string}
                  onChange={(val) => handleValueChange(field.key, val)}
                  placeholder={t('systemConfig:messages.selectProviderFirst')}
                  disabled={isSaving || !selectedProvider}
                  className="max-w-xs"
                />
                <Link
                  to="/admin/llm-catalog"
                  className="text-xs text-primary hover:underline whitespace-nowrap flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  {t('systemConfig:actions.addModel')}
                </Link>
              </div>
            </div>
          );
        }

        // Regular select with fixed options from translations
        const selectOptions = getSelectOptions();
        return (
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex-1">
              <label className="text-sm font-medium text-content">{label}</label>
              <p className="text-xs text-muted mt-0.5">{description}</p>
            </div>
            <Select
              options={selectOptions}
              value={value as string}
              onChange={(val) => handleValueChange(field.key, val)}
              placeholder={selectOptions[0]?.label || 'Select...'}
              disabled={isSaving}
              className="max-w-xs"
            />
          </div>
        );

      case 'number':
        return (
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex-1">
              <label className="text-sm font-medium text-content">{label}</label>
              <p className="text-xs text-muted mt-0.5">{description}</p>
            </div>
            <Input
              type="number"
              value={value as string}
              onChange={(e) => handleValueChange(field.key, e.target.value)}
              disabled={isSaving}
              className="max-w-xs"
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex-1">
              <label className="text-sm font-medium text-content">{label}</label>
              <p className="text-xs text-muted mt-0.5">{description}</p>
            </div>
            <Input
              type="text"
              value={value as string}
              onChange={(e) => handleValueChange(field.key, e.target.value)}
              disabled={isSaving}
              className="max-w-xs"
            />
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100svh-64px)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const hasChanges = changedKeys.size > 0;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('systemConfig:header.title')}
        showBackButton={true}
        showHomeButton={true}
        showContentFilter={false}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content">
                {t('systemConfig:header.title')}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {t('systemConfig:header.description')}
              </p>
            </div>
            <Button
              onClick={handleSaveAll}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? t('systemConfig:actions.saving') : `Save (${changedKeys.size})`}
            </Button>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {(Object.keys(SECTIONS) as Array<keyof typeof SECTIONS>).map((sectionKey) => {
              const fields = SECTIONS[sectionKey];
              if (!fields || fields.length === 0) return null;

              return (
                <Card key={sectionKey}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {t(`systemConfig:categories.${sectionKey}`)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {fields.map((field) => (
                      <div key={field.key} className="px-6">
                        {renderField(sectionKey, field)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
