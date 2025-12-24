import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { vi } from 'vitest';

// Create a test i18n instance
const createTestI18n = () => {
  const testI18n = i18n.createInstance();
  testI18n.init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'home', 'dashboard'],
    defaultNS: 'common',
    resources: {
      en: {
        common: {
          clickHere: 'Click here',
        },
        home: {
          accessButton: 'Sign In',
          signupButton: 'Sign Up',
        },
        dashboard: {
          title: 'Dashboard',
          tabs: {
            discover: 'Discover',
            chat: 'Chat',
            story: 'Story',
          },
          sections: {
            popularCharacters: 'Popular Characters',
            favoriteCharacters: 'Favorite Characters',
            popular: 'Popular',
            favorites: 'Favorites',
            myStories: 'My Stories',
            popularStories: 'Popular Stories',
            mine: 'Mine',
          },
        },
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });
  return testI18n;
};

interface AllTheProvidersProps {
  children: ReactNode;
  initialEntries?: string[];
}

function AllTheProviders({ children, initialEntries = ['/'] }: AllTheProvidersProps) {
  const testI18n = createTestI18n();

  const Router = initialEntries.length > 0 ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries.length > 0 ? { initialEntries } : {};

  return (
    <I18nextProvider i18n={testI18n}>
      <Router {...routerProps}>
        {children}
      </Router>
    </I18nextProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { initialEntries, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialEntries={initialEntries}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

export * from '@testing-library/react';
export { customRender as render };
