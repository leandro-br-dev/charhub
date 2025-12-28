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
    // Desktop view has the button visible, mobile has it in hamburger menu
    // Both should be present in DOM (desktop shows on md+, mobile shows on <md)
    const signInButtons = screen.getAllByText('Sign In');
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should render Sign Up button with correct text', () => {
    renderWithProviders(<PublicHeader />);
    // Desktop view has the button visible, mobile has it in hamburger menu
    const signUpButtons = screen.getAllByText('Sign Up');
    expect(signUpButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should navigate to /login when Sign In button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicHeader />);

    // Get the desktop Sign In button (first one in desktop view)
    const signInButtons = screen.getAllByText('Sign In');
    await user.click(signInButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should navigate to /signup when Sign Up button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PublicHeader />);

    // Get the desktop Sign Up button (first one in desktop view)
    const signUpButtons = screen.getAllByText('Sign Up');
    await user.click(signUpButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('should have fixed positioning at top-right', () => {
    const { container } = renderWithProviders(<PublicHeader />);

    const header = container.querySelector('header');
    expect(header).toHaveClass('fixed', 'top-0', 'right-0');
  });
});
