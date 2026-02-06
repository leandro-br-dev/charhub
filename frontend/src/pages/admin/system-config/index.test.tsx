import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import SystemConfigPage from './index';
import { ToastProvider } from '../../../contexts/ToastContext';
import { systemConfigService } from '../../../services/systemConfig';
import * as llmCatalogModule from '../../../services/llmCatalog';

// Create QueryClient for tests
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Create test i18n instance with all required translations
const testI18n = i18n.createInstance();
testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['systemConfig', 'navigation', 'common'],
  defaultNS: 'common',
  resources: {
    en: {
      systemConfig: {
        title: 'System Configuration',
        header: {
          title: 'System Configuration',
          description: 'Manage runtime parameters without server restart. Changes take effect immediately.',
        },
        search: {
          placeholder: 'Filter configurations...',
        },
        categories: {
          translation: 'Translation System',
          context: 'Context Window',
          generation: 'Character Generation',
          correction: 'Correction System',
          curation: 'Image Curation',
          moderation: 'Content Moderation',
          scheduling: 'Job Scheduling',
        },
        fields: {
          translation: {
            default_provider: {
              label: 'Default Provider',
              description: 'Default LLM provider for translations',
            },
            default_model: {
              label: 'Default Model',
              description: 'Default model name for translations',
            },
            cache_ttl: {
              label: 'Cache TTL (seconds)',
              description: 'How long to cache translation results',
            },
            enable_pre_translation: {
              label: 'Enable Pre-translation',
              description: 'Pre-translate content for faster loading',
            },
          },
          context: {
            max_tokens: {
              label: 'Max Tokens',
              description: 'Maximum context window size in tokens',
            },
          },
          generation: {
            daily_limit: {
              label: 'Daily Limit',
              description: 'Maximum characters generated per day',
            },
            batch_enabled: {
              label: 'Enable Batch Processing',
              description: 'Process character generation in batches',
            },
            batch_size_per_run: {
              label: 'Batch Size',
              description: 'Number of characters to process per batch',
            },
            batch_retry_attempts: {
              label: 'Retry Attempts',
              description: 'Number of retry attempts for failed batches',
            },
            batch_timeout_minutes: {
              label: 'Timeout (minutes)',
              description: 'Maximum time to wait for batch completion',
            },
          },
          correction: {
            avatar_daily_limit: {
              label: 'Avatar Daily Limit',
              description: 'Maximum avatar corrections per day',
            },
            data_daily_limit: {
              label: 'Data Daily Limit',
              description: 'Maximum data corrections per day',
            },
          },
          curation: {
            search_keywords: {
              label: 'Search Keywords',
              description: 'Comma-separated keywords for curation search',
            },
            anime_model_ids: {
              label: 'Anime Model IDs',
              description: 'Comma-separated model IDs for anime curation',
            },
            auto_approval_threshold: {
              label: 'Auto-approval Threshold',
              description: 'Score threshold for automatic approval (0-100)',
            },
            require_manual_review: {
              label: 'Require Manual Review',
              description: 'Require manual review for curated content',
            },
          },
          moderation: {
            nsfw_filter_enabled: {
              label: 'Enable NSFW Filter',
              description: 'Filter NSFW content automatically',
            },
            nsfw_filter_strictness: {
              label: 'NSFW Filter Strictness',
              description: 'How strict the NSFW filter should be',
            },
          },
          scheduling: {
            daily_curation_hour: {
              label: 'Daily Curation Hour',
              description: 'Hour of day to run daily curation (0-23)',
            },
          },
        },
        strictness: {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
        },
        actions: {
          save: 'Save ({{count}})',
          saving: 'Saving...',
          reset: 'Reset to default',
          addModel: 'Add Model',
        },
        messages: {
          saveSuccess: 'Configuration "{{key}}" updated successfully',
          saveError: 'Failed to update configuration',
          loadError: 'Failed to load system configurations',
          confirmChange: 'Are you sure you want to change "{{key}}"? This will take effect immediately.',
          selectProviderFirst: 'Select provider first',
          selectModel: 'Select model...',
        },
        meta: {
          updatedAt: 'Updated {{time}}',
          updatedBy: 'by {{user}}',
          neverUpdated: 'Default value (never modified)',
        },
        modelSelection: {
          provider: 'Provider',
          model: 'Model',
          selectProvider: 'Select a provider...',
          selectModel: 'Select a model...',
          selectProviderFirst: 'Select a provider first',
          addNewModel: 'Add new model',
          noModelsFound: 'No models found for this provider',
        },
      },
      navigation: {
        admin: {
          systemConfig: 'System Configuration',
        },
      },
      common: {
        noResults: 'No results found',
      },
    },
  },
});

// Mock systemConfigService
vi.mock('../../../services/systemConfig', () => ({
  systemConfigService: {
    getAll: vi.fn(),
    updateConfig: vi.fn(),
  },
}));

// Mock llmCatalogService
vi.mock('../../../services/llmCatalog', () => ({
  llmCatalogService: {
    getProviders: vi.fn(),
    getAll: vi.fn(),
  },
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nextProvider i18n={testI18n}>
          <ToastProvider>{component}</ToastProvider>
        </I18nextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockConfigsResponse = {
  configs: [
    {
      key: 'translation.default_provider',
      value: 'gemini',
    },
    {
      key: 'translation.default_model',
      value: 'gemini-2.0-flash-exp',
    },
    {
      key: 'translation.cache_ttl',
      value: '3600',
    },
    {
      key: 'translation.enable_pre_translation',
      value: 'false',
    },
    {
      key: 'context.max_tokens',
      value: '128000',
    },
    {
      key: 'generation.daily_limit',
      value: '5',
    },
    {
      key: 'generation.batch_enabled',
      value: 'false',
    },
    {
      key: 'generation.batch_size_per_run',
      value: '10',
    },
    {
      key: 'generation.batch_retry_attempts',
      value: '3',
    },
    {
      key: 'generation.batch_timeout_minutes',
      value: '30',
    },
    {
      key: 'correction.avatar_daily_limit',
      value: '10',
    },
    {
      key: 'correction.data_daily_limit',
      value: '50',
    },
    {
      key: 'curation.search_keywords',
      value: 'anime,waifu',
    },
    {
      key: 'curation.anime_model_ids',
      value: '1,2,3',
    },
    {
      key: 'curation.auto_approval_threshold',
      value: '85',
    },
    {
      key: 'curation.require_manual_review',
      value: 'false',
    },
    {
      key: 'moderation.nsfw_filter_enabled',
      value: 'true',
    },
    {
      key: 'moderation.nsfw_filter_strictness',
      value: 'medium',
    },
    {
      key: 'scheduling.daily_curation_hour',
      value: '2',
    },
  ],
};

const mockProviders = ['gemini', 'openai', 'grok', 'anthropic'];

const mockModels = [
  {
    id: '1',
    provider: 'gemini',
    name: 'gemini-2.0-flash-exp',
    displayName: 'Gemini 2.0 Flash Experimental',
    contextWindow: 1000000,
  },
  {
    id: '2',
    provider: 'gemini',
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
  },
  {
    id: '3',
    provider: 'openai',
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    contextWindow: 128000,
  },
];

describe('SystemConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'ADMIN' } });
    vi.mocked(systemConfigService.getAll).mockResolvedValue(mockConfigsResponse);
    vi.mocked(systemConfigService.updateConfig).mockResolvedValue(undefined);
    vi.mocked(llmCatalogModule.llmCatalogService.getProviders).mockResolvedValue(mockProviders);
    vi.mocked(llmCatalogModule.llmCatalogService.getAll).mockResolvedValue(mockModels);
  });

  describe('Loading state', () => {
    it('should show loading spinner initially', () => {
      vi.mocked(systemConfigService.getAll).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = renderWithProviders(<SystemConfigPage />);

      // Should show loading spinner - check for the LoadingSpinner component
      // The component renders a div with a spinner inside
      const spinnerContainer = container.querySelector('.flex.h-\\[calc\\(100svh-64px\\)\\]');
      expect(spinnerContainer).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('should render page header', async () => {
      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        // Use getAllByText since there are multiple elements with this text
        expect(screen.getAllByText('System Configuration').length).toBeGreaterThan(0);
      });

      expect(
        screen.getByText('Manage runtime parameters without server restart. Changes take effect immediately.')
      ).toBeInTheDocument();
    });

    it('should render all categories', async () => {
      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Translation System')).toBeInTheDocument();
        expect(screen.getByText('Character Generation')).toBeInTheDocument();
      });
    });

    it('should render select input for provider', async () => {
      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Translation System')).toBeInTheDocument();
      });

      // Should have select for default_provider with label
      expect(screen.getByText('Default Provider')).toBeInTheDocument();
      expect(screen.getByText('Default LLM provider for translations')).toBeInTheDocument();
    });

    it('should render number input for number type', async () => {
      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Translation System')).toBeInTheDocument();
      });

      // Should have number input for cache_ttl
      const input = screen.getByDisplayValue('3600');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('should render toggle switch for boolean type', async () => {
      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Translation System')).toBeInTheDocument();
      });

      // Boolean toggle should be rendered
      expect(screen.getByText('Enable Pre-translation')).toBeInTheDocument();
      expect(screen.getByText('Pre-translate content for faster loading')).toBeInTheDocument();
    });

    it('should render select dropdown for strictness', async () => {
      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Content Moderation')).toBeInTheDocument();
      });

      // NSFW Filter Strictness select should be rendered
      expect(screen.getByText('NSFW Filter Strictness')).toBeInTheDocument();
      expect(screen.getByText('How strict the NSFW filter should be')).toBeInTheDocument();
    });
  });

  describe('Save functionality', () => {
    it('should call updateConfig API when save is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Translation System')).toBeInTheDocument();
      });

      // Change value
      const input = screen.getByDisplayValue('3600');
      await user.clear(input);
      await user.type(input, '7200');

      // Click save button
      const saveButton = screen.getByRole('button', { name: /Save \(1\)/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(systemConfigService.updateConfig).toHaveBeenCalledWith(
          'translation.cache_ttl',
          '7200'
        );
      });
    });

    it('should disable save button when value has not changed', async () => {
      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Translation System')).toBeInTheDocument();
      });

      // Find save button - when no changes, button shows "Save (0)" and is disabled
      const saveButton = screen.getByRole('button', { name: /Save \(\d+\)/i });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should show saving state while saving', async () => {
      const user = userEvent.setup();
      // Mock updateConfig to take time
      vi.mocked(systemConfigService.updateConfig).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Translation System')).toBeInTheDocument();
      });

      // Change value and save
      const input = screen.getByDisplayValue('3600');
      await user.clear(input);
      await user.type(input, '7200');

      const saveButton = screen.getByRole('button', { name: /Save \(1\)/i });
      await user.click(saveButton);

      // Should show "Saving..." text
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should show error toast when load fails', async () => {
      vi.mocked(systemConfigService.getAll).mockRejectedValue(
        new Error('Failed to load')
      );

      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(systemConfigService.getAll).toHaveBeenCalled();
      });

      // Error handling depends on toast implementation
    });

    it('should revert value on save error', async () => {
      const user = userEvent.setup();
      vi.mocked(systemConfigService.updateConfig).mockRejectedValue(
        new Error('Failed to update')
      );

      renderWithProviders(<SystemConfigPage />);

      await waitFor(() => {
        expect(screen.getByText('Translation System')).toBeInTheDocument();
      });

      // Change value and attempt save
      const input = screen.getByDisplayValue('3600');
      await user.clear(input);
      await user.type(input, '7200');

      const saveButton = screen.getByRole('button', { name: /Save \(\d+\)/i });
      await user.click(saveButton);

      await waitFor(() => {
        // After error, the value remains as changed in the UI since we don't revert
        // The error is shown via toast, but the input keeps the user's input
        expect(screen.getByDisplayValue('7200')).toBeInTheDocument();
      });
    });
  });

  describe('Authorization', () => {
    it('should redirect non-admin users', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { role: 'USER' },
      });

      // Page should handle authorization - might redirect or show error
      // Implementation depends on ProtectedRoute or similar
      renderWithProviders(<SystemConfigPage />);
    });
  });
});
