import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../index';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { ToastProvider } from '../../../contexts/ToastContext';

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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={testI18n}>
        <ToastProvider>{component}</ToastProvider>
      </I18nextProvider>
    </BrowserRouter>
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
