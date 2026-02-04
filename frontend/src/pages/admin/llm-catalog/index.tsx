import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { llmCatalogService, type LLMProvider, type LLMModelInfo, type LLMModelFormValues } from '../../../services';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Dialog } from '../../../components/ui/Dialog';
import Switch from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';

/**
 * Known models for each provider
 */
const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-flash-thinking',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-thinking',
    'gemini-2.0-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.0-pro'
  ],
  openai: [
    'o3-mini',
    'o1-mini',
    'o1-preview',
    'gpt-4.1',
    'gpt-4o-mini',
    'gpt-4o',
    'chatgpt-4o-latest',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ],
  grok: [
    'grok-2-1212',
    'grok-2-vision-1212',
    'grok-beta',
    'grok-vision-beta'
  ],
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-sonnet:beta',
    'anthropic/claude-3.5-haiku',
    'anthropic/claude-3.5-haiku:beta',
    'anthropic/claude-3-opus',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/o1-preview',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.1-405b-instruct'
  ],
  anthropic: [
    'claude-3.7-sonnet',
    'claude-3.5-sonnet',
    'claude-3.5-haiku',
    'claude-3-opus',
    'claude-3-sonnet'
  ],
  together_ai: [
    'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    'mistralai/Mixtral-8x22B-Instruct-v0.1',
    'Qwen/Qwen2.5-72B-Instruct'
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.3-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it'
  ]
};

/**
 * Provider selector button props
 */
interface ProviderButtonProps {
  provider: LLMProvider;
  isSelected: boolean;
  onClick: () => void;
  displayName: string;
}

function ProviderButton({ provider, isSelected, onClick, displayName }: ProviderButtonProps): JSX.Element {
  const className = `w-full text-left px-4 py-3 rounded-lg transition-colors ${
    isSelected
      ? 'bg-primary text-white font-medium'
      : 'bg-light hover:bg-primary/10 text-content'
  }`;

  return (
    <button type="button" className={className} onClick={onClick}>
      {displayName}
    </button>
  );
}

/**
 * Model card props
 */
interface ModelCardProps {
  model: LLMModelInfo;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleAvailable: () => void;
  onDelete: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function ModelCard({ model, onEdit, onToggleActive, onToggleAvailable, onDelete, t }: ModelCardProps): JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate" title={model.displayName}>
              {model.displayName}
            </CardTitle>
            <p className="text-xs text-muted font-mono mt-0.5 truncate" title={model.name}>
              {model.name}
            </p>
          </div>
          <Badge className={llmCatalogService.getCategoryBadgeClass(model.category)}>
            {llmCatalogService.getCategoryDisplayName(model.category)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Type badge */}
        <div>
          <Badge variant="outline" className={llmCatalogService.getTypeBadgeClass(model.type)}>
            {llmCatalogService.getTypeDisplayName(model.type)}
          </Badge>
        </div>

        {/* Description */}
        {model.description && (
          <p className="text-xs text-content line-clamp-2 min-h-[2.5rem]">
            {model.description}
          </p>
        )}

        {/* Capabilities */}
        <div className="flex flex-wrap gap-2 text-xs">
          {model.supportsTools && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="material-symbols-outlined text-sm">build</span>
              {t('llmCatalog:model.supportsTools')}
            </span>
          )}
          {model.supportsVision && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              <span className="material-symbols-outlined text-sm">visibility</span>
              {t('llmCatalog:model.supportsVision')}
            </span>
          )}
          {model.supportsReasoning && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <span className="material-symbols-outlined text-sm">psychology</span>
              {t('llmCatalog:model.supportsReasoning')}
            </span>
          )}
        </div>

        {/* Context window info */}
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">memory</span>
            {t('llmCatalog:model.contextWindow')}: {llmCatalogService.formatContextWindow(model.contextWindow)}
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">output</span>
            {t('llmCatalog:model.maxOutput')}: {llmCatalogService.formatContextWindow(model.maxOutput)}
          </span>
        </div>

        {/* Status toggles */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{t('llmCatalog:model.isActive')}:</span>
            <Switch
              checked={model.isActive}
              onChange={onToggleActive}
              size="small"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{t('llmCatalog:model.isAvailable')}:</span>
            <Switch
              checked={model.isAvailable}
              onChange={onToggleAvailable}
              size="small"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button size="small" variant="light" onClick={onEdit} className="flex-1">
            <span className="material-symbols-outlined text-sm">edit</span>
            {t('llmCatalog:actions.editModel')}
          </Button>
          <Button size="small" variant="danger" onClick={onDelete}>
            <span className="material-symbols-outlined text-sm">delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Model form modal props
 */
interface ModelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: LLMModelFormValues) => void;
  model: LLMModelInfo | null;
  providers: LLMProvider[];
  selectedProvider: LLMProvider;
  onProviderChange?: (provider: LLMProvider) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function ModelFormModal({ isOpen, onClose, onSubmit, model, providers, selectedProvider, onProviderChange, t }: ModelFormModalProps): JSX.Element {
  const isEdit = model !== null;
  const [formData, setFormData] = useState<LLMModelFormValues>(
    model
      ? {
          provider: model.provider,
          name: model.name,
          displayName: model.displayName,
          category: model.category,
          type: model.type,
          contextWindow: model.contextWindow,
          maxOutput: model.maxOutput,
          supportsTools: model.supportsTools,
          supportsVision: model.supportsVision,
          supportsReasoning: model.supportsReasoning,
          description: model.description || '',
          version: model.version,
          source: model.source || '',
          isActive: model.isActive,
          isAvailable: model.isAvailable
        }
      : {
          provider: 'gemini' as LLMProvider,
          name: '',
          displayName: '',
          category: 'CHAT',
          type: 'TEXT',
          contextWindow: 128000,
          maxOutput: 4096,
          supportsTools: false,
          supportsVision: false,
          supportsReasoning: false,
          description: '',
          version: '1.0.0',
          source: '',
          isActive: true,
          isAvailable: true
        }
  );

  const handleChange = (field: keyof LLMModelFormValues, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // When provider changes, notify parent to update selected provider filter
    if (field === 'provider' && onProviderChange) {
      onProviderChange(value as LLMProvider);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const isFormValid = formData.name && formData.displayName && formData.category && formData.type;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('llmCatalog:form.editTitle') : t('llmCatalog:form.addTitle')}
      size="lg"
      actions={[
        {
          label: t('llmCatalog:actions.cancel'),
          onClick: onClose,
          variant: 'light'
        },
        {
          label: t('llmCatalog:actions.save'),
          onClick: handleSubmit,
          variant: 'primary',
          disabled: !isFormValid
        }
      ]}
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Provider selection */}
        <div>
          <label className="block text-sm font-medium text-content mb-1">
            {t('llmCatalog:form.provider')}
            {isEdit && <span className="ml-2 text-xs text-warning">({t('llmCatalog:form.providerChangeWarning')})</span>}
          </label>
          <select
            value={formData.provider}
            onChange={(e) => handleChange('provider', e.target.value as LLMProvider)}
            className="w-full rounded-lg border border-input bg-light px-3 py-2 text-sm text-content focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            disabled={isEdit}
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {llmCatalogService.getProviderDisplayName(p)}
              </option>
            ))}
          </select>
          {isEdit && (
            <p className="mt-1 text-xs text-muted">{t('llmCatalog:form.providerChangeHelp')}</p>
          )}
        </div>

        {/* Model Name */}
        <div>
          <label className="block text-sm font-medium text-content mb-1">
            {t('llmCatalog:form.name')} *
          </label>
          <select
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full rounded-lg border border-input bg-light px-3 py-2 text-sm text-content focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            disabled={isEdit}
          >
            <option value="">{t('llmCatalog:form.namePlaceholder')}</option>
            {PROVIDER_MODELS[formData.provider]?.map((modelName) => (
              <option key={modelName} value={modelName}>
                {modelName}
              </option>
            ))}
          </select>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-content mb-1">
            {t('llmCatalog:form.displayName')} *
          </label>
          <Input
            type="text"
            placeholder={t('llmCatalog:form.displayNamePlaceholder')}
            value={formData.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
          />
        </div>

        {/* Category & Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content mb-1">
              {t('llmCatalog:form.category')} *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value as LLMModelFormValues['category'])}
              className="w-full rounded-lg border border-input bg-light px-3 py-2 text-sm text-content focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="CHAT">{t('llmCatalog:categories.CHAT')}</option>
              <option value="CODING">{t('llmCatalog:categories.CODING')}</option>
              <option value="REASONING">{t('llmCatalog:categories.REASONING')}</option>
              <option value="VISION">{t('llmCatalog:categories.VISION')}</option>
              <option value="SPEECH">{t('llmCatalog:categories.SPEECH')}</option>
              <option value="TRANSLATION">{t('llmCatalog:categories.TRANSLATION')}</option>
              <option value="AGENTIC">{t('llmCatalog:categories.AGENTIC')}</option>
              <option value="EMBEDDING">{t('llmCatalog:categories.EMBEDDING')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">
              {t('llmCatalog:form.type')} *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as LLMModelFormValues['type'])}
              className="w-full rounded-lg border border-input bg-light px-3 py-2 text-sm text-content focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="TEXT">{t('llmCatalog:types.TEXT')}</option>
              <option value="MULTIMODAL">{t('llmCatalog:types.MULTIMODAL')}</option>
              <option value="REASONING">{t('llmCatalog:types.REASONING')}</option>
              <option value="SPEECH">{t('llmCatalog:types.SPEECH')}</option>
              <option value="EMBEDDING">{t('llmCatalog:types.EMBEDDING')}</option>
            </select>
          </div>
        </div>

        {/* Context Window & Max Output */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content mb-1">
              {t('llmCatalog:form.contextWindow')} *
            </label>
            <Input
              type="number"
              placeholder={t('llmCatalog:form.contextWindowPlaceholder')}
              value={formData.contextWindow}
              onChange={(e) => handleChange('contextWindow', parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">
              {t('llmCatalog:form.maxOutput')} *
            </label>
            <Input
              type="number"
              placeholder={t('llmCatalog:form.maxOutputPlaceholder')}
              value={formData.maxOutput}
              onChange={(e) => handleChange('maxOutput', parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>

        {/* Version & Source */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content mb-1">
              {t('llmCatalog:form.version')}
            </label>
            <Input
              type="text"
              placeholder={t('llmCatalog:form.versionPlaceholder')}
              value={formData.version}
              onChange={(e) => handleChange('version', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">
              {t('llmCatalog:form.source')}
            </label>
            <Input
              type="url"
              placeholder={t('llmCatalog:form.sourcePlaceholder')}
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-content mb-1">
            {t('llmCatalog:form.description')}
          </label>
          <textarea
            placeholder={t('llmCatalog:form.descriptionPlaceholder')}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-light px-3 py-2 text-sm text-content focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Feature support checkboxes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-content">
            Capabilities
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="supportsTools"
                checked={formData.supportsTools}
                onChange={(e) => handleChange('supportsTools', e.target.checked)}
                className="rounded border-input"
              />
              <label htmlFor="supportsTools" className="text-sm text-content cursor-pointer">
                {t('llmCatalog:form.supportsTools')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="supportsVision"
                checked={formData.supportsVision}
                onChange={(e) => handleChange('supportsVision', e.target.checked)}
                className="rounded border-input"
              />
              <label htmlFor="supportsVision" className="text-sm text-content cursor-pointer">
                {t('llmCatalog:form.supportsVision')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="supportsReasoning"
                checked={formData.supportsReasoning}
                onChange={(e) => handleChange('supportsReasoning', e.target.checked)}
                className="rounded border-input"
              />
              <label htmlFor="supportsReasoning" className="text-sm text-content cursor-pointer">
                {t('llmCatalog:form.supportsReasoning')}
              </label>
            </div>
          </div>
        </div>

        {/* Status toggles */}
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isActive ?? true}
              onChange={(checked) => handleChange('isActive', checked)}
              size="medium"
            />
            <label className="text-sm text-content">
              {t('llmCatalog:form.isActive')}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.isAvailable ?? true}
              onChange={(checked) => handleChange('isAvailable', checked)}
              size="medium"
            />
            <label className="text-sm text-content">
              {t('llmCatalog:form.isAvailable')}
            </label>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default function LLMCatalogPage(): JSX.Element {
  const { t } = useTranslation(['llmCatalog', 'navigation', 'common']);
  const { addToast } = useToast();

  // Available providers (matching backend VALID_PROVIDERS)
  const providers: LLMProvider[] = ['gemini', 'openai', 'grok', 'openrouter', 'anthropic', 'together_ai', 'groq'];

  // State
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('gemini');
  const [allModels, setAllModels] = useState<LLMModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<LLMModelInfo | null>(null);
  const [deletingModel, setDeletingModel] = useState<LLMModelInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load models
  const loadModels = async () => {
    try {
      setIsLoading(true);
      const models = await llmCatalogService.getAll();
      setAllModels(models);
    } catch (error) {
      console.error('[LLMCatalogPage] Failed to load models:', error);
      addToast(t('llmCatalog:messages.loadError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, [t, addToast]);

  // Filter models by selected provider
  const filteredModels = useMemo(() => {
    return allModels.filter(model => model.provider === selectedProvider);
  }, [allModels, selectedProvider]);

  // Handlers
  const handleAddModel = () => {
    setEditingModel(null);
    setIsModalOpen(true);
  };

  const handleEditModel = (model: LLMModelInfo) => {
    setEditingModel(model);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (model: LLMModelInfo) => {
    const result = await llmCatalogService.update(model.id, { isActive: !model.isActive });
    if (result.success) {
      addToast(t('llmCatalog:messages.toggleSuccess'), 'success');
      await loadModels();
    } else {
      addToast(t(result.message), 'error');
    }
  };

  const handleToggleAvailable = async (model: LLMModelInfo) => {
    const result = await llmCatalogService.toggleAvailability(model.id);
    if (result.success) {
      addToast(t('llmCatalog:messages.toggleSuccess'), 'success');
      await loadModels();
    } else {
      addToast(t(result.message), 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingModel) return;

    const result = await llmCatalogService.delete(deletingModel.id);
    if (result.success) {
      addToast(t('llmCatalog:messages.deleteSuccess'), 'success');
      await loadModels();
    } else {
      addToast(t(result.message), 'error');
    }

    setDeletingModel(null);
  };

  const handleFormSubmit = async (values: LLMModelFormValues) => {
    const result = editingModel
      ? await llmCatalogService.update(editingModel.id, values)
      : await llmCatalogService.create(values);

    if (result.success) {
      addToast(t(editingModel ? 'llmCatalog:messages.updateSuccess' : 'llmCatalog:messages.createSuccess'), 'success');
      setIsModalOpen(false);
      await loadModels();
    } else {
      addToast(t(result.message), 'error');
    }
  };

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      const result = await llmCatalogService.refreshCache();
      if (result.success) {
        addToast(t('llmCatalog:messages.cacheRefreshed'), 'success');
        await loadModels();
      } else {
        addToast(t(result.message), 'error');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100svh-64px)] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={t('llmCatalog:header.title')}
        showBackButton={true}
        showHomeButton={true}
        showContentFilter={false}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content">
                {t('llmCatalog:header.title')}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {t('llmCatalog:header.description')}
              </p>
            </div>
            <Button
              size="small"
              variant="light"
              onClick={handleRefreshCache}
              disabled={isRefreshing}
            >
              <span className="material-symbols-outlined text-sm">
                {isRefreshing ? 'refresh' : 'refresh'}
              </span>
              {t('llmCatalog:actions.refreshCache')}
            </Button>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Provider selector (left column) */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('llmCatalog:providers.selectProvider')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {providers.map((provider) => (
                    <ProviderButton
                      key={provider}
                      provider={provider}
                      isSelected={selectedProvider === provider}
                      onClick={() => setSelectedProvider(provider)}
                      displayName={llmCatalogService.getProviderDisplayName(provider)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Models list (right column) */}
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-content">
                  {llmCatalogService.getProviderDisplayName(selectedProvider)}
                  <span className="ml-2 text-sm font-normal text-muted">
                    ({filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'})
                  </span>
                </h2>
                <Button size="small" onClick={handleAddModel}>
                  <span className="material-symbols-outlined text-sm">add</span>
                  {t('llmCatalog:actions.addModel')}
                </Button>
              </div>

              {filteredModels.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted">
                      {t('llmCatalog:messages.noModelsFound')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredModels.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      onEdit={() => handleEditModel(model)}
                      onToggleActive={() => handleToggleActive(model)}
                      onToggleAvailable={() => handleToggleAvailable(model)}
                      onDelete={() => setDeletingModel(model)}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <ModelFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        model={editingModel}
        providers={providers}
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
        t={t}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deletingModel !== null}
        onClose={() => setDeletingModel(null)}
        title={t('llmCatalog:actions.deleteModel')}
        description={t('llmCatalog:messages.deleteConfirm', { modelName: deletingModel?.displayName || deletingModel?.name || '' })}
        severity="critical"
        actions={[
          {
            label: t('llmCatalog:actions.cancel'),
            onClick: () => setDeletingModel(null),
            variant: 'light'
          },
          {
            label: t('llmCatalog:actions.confirm'),
            onClick: handleDeleteConfirm,
            variant: 'danger'
          }
        ]}
      />
    </div>
  );
}
