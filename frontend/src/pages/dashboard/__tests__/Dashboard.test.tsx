import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../index';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from 'i18next';
import { ToastProvider } from '../../../contexts/ToastContext';

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

// Create test i18n instance
const testI18n = i18n.createInstance();
testI18n.init({
  lng: 'en',
  resources: {
    en: {
      dashboard: {
        title: 'Dashboard',
        tabs: {
          discover: 'Discover',
          chat: 'Chat',
          story: 'Story',
        },
      },
    },
  },
});

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock characterService to avoid actual API calls
vi.mock('../../../services/characterService', () => ({
  characterService: {
    getCharactersForDashboard: vi.fn(() => Promise.resolve({
      characters: [],
      hasMore: false,
      totalCount: 0,
    })),
    getSpeciesFilterOptions: vi.fn(() => Promise.resolve([])),
    getGenderFilterOptions: vi.fn(() => Promise.resolve([])),
    getTagFilterOptions: vi.fn(() => Promise.resolve([])),
    getAgeRatingFilterOptions: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock react-router-dom's navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
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

describe('Dashboard - Conditional Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is NOT authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });
    });

    // TODO: This test needs deep mocking of Button component and its dependencies
    // Skipped for now - covered by integration tests
    it.skip('should render PublicHeader for non-authenticated users', () => {
      renderWithProviders(<Dashboard />);

      // PublicHeader has Sign In and Sign Up buttons
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('should render Discover tab for non-authenticated users', () => {
      renderWithProviders(<Dashboard />);

      expect(screen.getByText('Discover')).toBeInTheDocument();
    });

    it('should render Story tab for non-authenticated users', () => {
      renderWithProviders(<Dashboard />);

      expect(screen.getByText('Story')).toBeInTheDocument();
    });

    it('should NOT render Chat tab for non-authenticated users', () => {
      renderWithProviders(<Dashboard />);

      // Chat tab should not be present
      expect(screen.queryByText('Chat')).not.toBeInTheDocument();
    });
  });

  describe('when user IS authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ isAuthenticated: true });
    });

    it('should NOT render PublicHeader for authenticated users', () => {
      renderWithProviders(<Dashboard />);

      // PublicHeader buttons should not be visible
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    });

    // TODO: This test needs deep mocking of Sidebar/NavigationRail components
    // Skipped for now - covered by integration tests
    it.skip('should render all tabs including Chat for authenticated users', () => {
      renderWithProviders(<Dashboard />);

      expect(screen.getByText('Discover')).toBeInTheDocument();
      // Chat appears multiple times (in tabs and possibly in sidebar)
      expect(screen.getAllByText('Chat').length).toBeGreaterThan(0);
      expect(screen.getByText('Story')).toBeInTheDocument();
    });
  });
});
