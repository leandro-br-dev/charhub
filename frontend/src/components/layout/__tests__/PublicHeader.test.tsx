import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicHeader } from '../PublicHeader';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

// Create test i18n instance
const testI18n = i18n.createInstance();
testI18n.init({
  lng: 'en',
  resources: {
    en: {
      home: {
        accessButton: 'Sign In',
        signupButton: 'Sign Up',
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

// Mock the navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={testI18n}>{component}</I18nextProvider>
    </BrowserRouter>
  );
};

describe('PublicHeader', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should render Sign In button with correct text', () => {
    renderWithProviders(<PublicHeader />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should render Sign Up button with correct text', () => {
    renderWithProviders(<PublicHeader />);
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('should navigate to /login when Sign In button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicHeader />);

    const signInButton = screen.getByText('Sign In');
    await user.click(signInButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should navigate to /signup when Sign Up button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicHeader />);

    const signUpButton = screen.getByText('Sign Up');
    await user.click(signUpButton);

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('should have fixed positioning at top-right', () => {
    const { container } = renderWithProviders(<PublicHeader />);

    const header = container.querySelector('header');
    expect(header).toHaveClass('fixed', 'top-0', 'right-0');
  });
});
