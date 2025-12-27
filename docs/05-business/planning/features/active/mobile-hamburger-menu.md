# Responsive Mobile Hamburger Menu - Feature Specification

**Status**: 📋 Active (Planning)
**Version**: 1.0.0
**Date Created**: 2025-12-27
**Last Updated**: 2025-12-27
**Priority**: Critical
**Assigned To**: Agent Coder (Parallel Track)
**GitHub Issue**: [#61](https://github.com/leandro-br-dev/charhub/issues/61)

---

## Overview

Implementação de menu hambúrguer responsivo para dispositivos móveis, resolvendo problema crítico de UX onde o header fica sobrecarregado em telas pequenas (320px-375px). Atualmente, múltiplos controles (theme toggle, language switcher, login, signup) ocupam uma única linha, criando experiência ruim e problemas de touch targets.

---

## Business Value

**Problema Crítico**:
- Header sobrecarregado em mobile (320-375px viewport)
- Múltiplos botões competindo por espaço limitado
- Touch targets muito pequenos (< 44px - padrão de acessibilidade)
- Possível scroll horizontal em telas pequenas
- Experiência frustrante para usuários mobile

**Impacto no Negócio**:
- 📱 **60-70% do tráfego web é mobile** (tendência global)
- 😤 UX ruim = alta taxa de rejeição
- 🚫 Usuários podem desistir antes mesmo de fazer signup
- ⭐ Primeira impressão negativa do produto

**Solução**:
- Menu hambúrguer padrão da indústria
- Drawer/Sheet lateral com todos os controles
- Layout limpo: Logo + Menu Icon
- Touch targets adequados (≥44px)

**Impacto Esperado**:
- ✅ Redução de 40% na taxa de rejeição mobile
- ✅ Melhoria na conversão de signup (mobile)
- ✅ Conformidade com padrões de acessibilidade
- ✅ Preparação para futura navegação mobile (stories, characters, etc.)

---

## User Stories

### US-1: Header Limpo em Mobile
**Como** usuário acessando CharHub em smartphone
**Quero** ver um header limpo com logo e menu
**Para que** eu tenha uma experiência visual agradável sem elementos sobrecarregados

**Acceptance Criteria**:
- [ ] Em viewports ≤768px, mostrar apenas logo + ícone de menu hambúrguer
- [ ] Ocultar botões Login/Signup da barra principal
- [ ] Ocultar theme toggle e language switcher da barra principal
- [ ] Ícone de hambúrguer tem tamanho adequado (≥44x44px touch target)
- [ ] Layout não quebra em 320px (menor viewport comum)
- [ ] Sem scroll horizontal

### US-2: Menu Drawer Funcional
**Como** usuário mobile
**Quero** abrir menu lateral clicando no ícone
**Para que** eu acesse todos os controles de forma organizada

**Acceptance Criteria**:
- [ ] Clicar no hambúrguer abre drawer lateral (esquerda ou direita)
- [ ] Drawer tem overlay escuro semi-transparente
- [ ] Clicar fora do drawer fecha o menu
- [ ] Botão X ou Close dentro do drawer
- [ ] Animação suave de abertura/fechamento (300ms)
- [ ] Body scroll desabilitado quando drawer aberto

### US-3: Controles Organizados no Drawer
**Como** usuário mobile com drawer aberto
**Quero** ver todos os controles organizados verticalmente
**Para que** eu consiga acessar todas as funcionalidades facilmente

**Acceptance Criteria**:
- [ ] **Seção 1 - Links de navegação** (futura):
  - Dashboard
  - Characters
  - Stories
  - (Placeholder para expansão futura)
- [ ] **Divider/Separator**
- [ ] **Seção 2 - Settings**:
  - Theme toggle (Dark/Light) - full width
  - Language selector - full width
- [ ] **Divider/Separator**
- [ ] **Seção 3 - Auth Actions**:
  - Login button - full width, secondary style
  - Signup button - full width, primary style
- [ ] Todos os touch targets ≥44x44px
- [ ] Espaçamento adequado entre itens (16-24px)

### US-4: Desktop Não Afetado
**Como** usuário acessando em desktop
**Quero** continuar vendo o header atual sem mudanças
**Para que** minha experiência desktop não seja prejudicada

**Acceptance Criteria**:
- [ ] Em viewports >768px, mostrar header atual (sem hambúrguer)
- [ ] Todos os botões visíveis na barra principal
- [ ] Drawer component não renderiza em desktop
- [ ] Sem regressions no comportamento desktop

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Responsive Strategy                    │
└─────────────────────────────────────────────────────────┘

Mobile (≤768px)                    Desktop (>768px)
┌──────────────────┐              ┌───────────────────────────────┐
│ [Logo] [☰]      │              │ [Logo] [Theme] [Lang] [Login] │
└──────────────────┘              │        [Signup]               │
        ↓ (click)                 └───────────────────────────────┘
┌──────────────────┐
│  Drawer/Sheet    │
│ ┌──────────────┐ │
│ │ [X] Close    │ │
│ ├──────────────┤ │
│ │ Navigation   │ │ (future)
│ │ - Dashboard  │ │
│ │ - Characters │ │
│ │ - Stories    │ │
│ ├──────────────┤ │
│ │ Settings     │ │
│ │ - Theme      │ │
│ │ - Language   │ │
│ ├──────────────┤ │
│ │ Auth         │ │
│ │ - Login      │ │
│ │ - Signup     │ │
│ └──────────────┘ │
└──────────────────┘

Component Tree:
PublicHeader
├─ Desktop View (md:flex)
│  ├─ Logo
│  ├─ Theme Toggle
│  ├─ Language Selector
│  ├─ Login Button
│  └─ Signup Button
└─ Mobile View (flex md:hidden)
   ├─ Logo
   ├─ Hamburger Button → Opens Sheet
   └─ Sheet (Drawer)
      ├─ Close Button
      ├─ Navigation Section
      ├─ Settings Section
      └─ Auth Section
```

---

## Implementation Details

### Component: `PublicHeader` (Modified)

**File**: `frontend/src/components/layout/PublicHeader.tsx`

**Current Structure** (to be modified):
```tsx
export function PublicHeader() {
  return (
    <header className="flex items-center justify-between p-4">
      <Logo />
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <LanguageSelector />
        <Button>Login</Button>
        <Button>Signup</Button>
      </div>
    </header>
  );
}
```

**New Structure**:
```tsx
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/Sheet';
import { Menu, X } from 'lucide-react'; // or your icon library

export function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="flex items-center justify-between p-4">
      <Logo />

      {/* Desktop View - unchanged */}
      <div className="hidden md:flex items-center gap-4">
        <ThemeToggle />
        <LanguageSelector />
        <Button variant="secondary">Login</Button>
        <Button variant="primary">Signup</Button>
      </div>

      {/* Mobile View - hamburger + drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="h-11 w-11" // 44px touch target
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-[280px] sm:w-[320px]">
          <MobileMenuContent onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
```

---

### Component: `MobileMenuContent` (New)

**File**: `frontend/src/components/layout/MobileMenuContent.tsx`

**Purpose**: Content of the mobile drawer/sheet

```tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/features/ThemeToggle';
import { LanguageSelector } from '@/components/features/LanguageSelector';
import { Separator } from '@/components/ui/Separator';

interface MobileMenuContentProps {
  onClose: () => void;
}

export function MobileMenuContent({ onClose }: MobileMenuContentProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="flex flex-col h-full py-6">
      {/* Header with Close button */}
      <div className="flex items-center justify-between mb-6 px-6">
        <h2 className="text-lg font-semibold">Menu</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close menu"
          className="h-11 w-11"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {/* Navigation Links - Future expansion */}
        {/* <div className="space-y-1 mb-4">
          <Button
            variant="ghost"
            className="w-full justify-start h-11"
            onClick={() => handleNavigate('/dashboard')}
          >
            Dashboard
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-11"
            onClick={() => handleNavigate('/characters')}
          >
            Characters
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-11"
            onClick={() => handleNavigate('/stories')}
          >
            Stories
          </Button>
        </div>
        <Separator className="my-4" /> */}

        {/* Settings Section */}
        <div className="space-y-3 mb-4">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider">
            {t('common:settings')}
          </p>

          {/* Theme Toggle - Full width */}
          <div className="px-3">
            <ThemeToggle variant="full-width" />
          </div>

          {/* Language Selector - Full width */}
          <div className="px-3">
            <LanguageSelector variant="full-width" />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Auth Section */}
        <div className="space-y-3 px-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            {t('common:account')}
          </p>

          <Button
            variant="secondary"
            className="w-full h-11"
            onClick={() => handleNavigate('/login')}
          >
            {t('common:login')}
          </Button>

          <Button
            variant="primary"
            className="w-full h-11"
            onClick={() => handleNavigate('/signup')}
          >
            {t('common:signup')}
          </Button>
        </div>
      </nav>

      {/* Footer - Optional branding */}
      <div className="px-6 pt-4 border-t">
        <p className="text-xs text-muted text-center">
          CharHub © 2025
        </p>
      </div>
    </div>
  );
}
```

---

### UI Components Required

#### Sheet/Drawer Component

**Recommendation**: Use existing UI library component

**Option 1 - shadcn/ui** (if already in project):
```bash
npx shadcn-ui@latest add sheet
```

**Option 2 - Headless UI** (if using):
```tsx
import { Dialog, Transition } from '@headlessui/react';
```

**Option 3 - Custom Implementation**:
```tsx
// frontend/src/components/ui/Sheet.tsx
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={() => onOpenChange(false)}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 z-40" />
        </Transition.Child>

        {children}
      </Dialog>
    </Transition>
  );
}

export function SheetTrigger({ children, asChild, ...props }: any) {
  return asChild ? children : <button {...props}>{children}</button>;
}

interface SheetContentProps {
  side?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}

export function SheetContent({
  side = 'right',
  className,
  children
}: SheetContentProps) {
  const slideFrom = side === 'right' ? 'translate-x-full' : '-translate-x-full';

  return (
    <Transition.Child
      as={Fragment}
      enter="transform transition ease-in-out duration-300"
      enterFrom={slideFrom}
      enterTo="translate-x-0"
      leave="transform transition ease-in-out duration-300"
      leaveFrom="translate-x-0"
      leaveTo={slideFrom}
    >
      <Dialog.Panel
        className={cn(
          'fixed top-0 bottom-0 z-50 bg-card border-l border-border shadow-lg overflow-y-auto',
          side === 'right' ? 'right-0' : 'left-0',
          className
        )}
      >
        {children}
      </Dialog.Panel>
    </Transition.Child>
  );
}
```

---

### Modifications to Existing Components

#### ThemeToggle Enhancement

**File**: `frontend/src/components/features/ThemeToggle.tsx`

**Add** `variant` prop for full-width mobile display:

```tsx
interface ThemeToggleProps {
  variant?: 'icon' | 'full-width';
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === 'full-width') {
    return (
      <div className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent">
        <span className="text-sm font-medium">Theme</span>
        <div className="flex gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTheme('light')}
          >
            Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTheme('dark')}
          >
            Dark
          </Button>
        </div>
      </div>
    );
  }

  // Original icon variant
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}
```

#### LanguageSelector Enhancement

**File**: `frontend/src/components/features/LanguageSelector.tsx`

**Add** `variant` prop for full-width mobile display:

```tsx
interface LanguageSelectorProps {
  variant?: 'compact' | 'full-width';
}

export function LanguageSelector({ variant = 'compact' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();

  if (variant === 'full-width') {
    return (
      <div className="w-full p-3 rounded-lg hover:bg-accent">
        <label className="text-sm font-medium mb-2 block">Language</label>
        <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            {/* ... other languages */}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Original compact variant
  return (
    <Select value={i18n.language} onValueChange={(val) => i18n.changeLanguage(val)}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      {/* ... */}
    </Select>
  );
}
```

---

## Responsive Breakpoints

### Tailwind Configuration

**File**: `tailwind.config.js` (verify existing breakpoints)

```js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // Small devices
      'md': '768px',   // Tablets (hamburger breakpoint)
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
    }
  }
}
```

**Breakpoint Strategy**:
- **≤767px**: Show hamburger menu (mobile/tablet portrait)
- **≥768px**: Show full header (tablet landscape/desktop)

**Rationale**:
- 768px is industry standard for mobile/desktop split
- Covers all common smartphone sizes (320px-414px)
- Tablets in portrait mode get mobile experience (better UX)
- Tablets in landscape mode get desktop experience

---

## Accessibility Considerations

### Touch Targets

**WCAG 2.1 AA Standard**: Minimum 44x44px touch targets

**Implementation**:
- Hamburger button: `className="h-11 w-11"` (44x44px)
- All drawer buttons: `className="h-11"` (44px height)
- Minimum spacing: 8px between interactive elements

### Keyboard Navigation

**Requirements**:
- Tab order: Logo → Hamburger → (Drawer opens) → Close → Nav items → Settings → Auth
- Enter/Space: Activate buttons
- Escape: Close drawer
- Focus visible: Clear focus indicators

**Implementation**:
```tsx
<Sheet onOpenChange={setIsOpen}>
  <SheetTrigger
    aria-label="Open navigation menu"
    aria-expanded={isOpen}
    aria-controls="mobile-menu"
  >
    <Menu />
  </SheetTrigger>

  <SheetContent
    id="mobile-menu"
    role="dialog"
    aria-modal="true"
    aria-labelledby="mobile-menu-title"
  >
    <h2 id="mobile-menu-title" className="sr-only">
      Navigation Menu
    </h2>
    {/* ... content */}
  </SheetContent>
</Sheet>
```

### Screen Readers

**ARIA Labels**:
- Hamburger: `aria-label="Open navigation menu"`
- Close button: `aria-label="Close navigation menu"`
- Drawer: `role="dialog"`, `aria-modal="true"`

**Focus Management**:
- When drawer opens: focus on close button
- When drawer closes: return focus to hamburger button
- Trap focus within drawer when open

**Implementation**:
```tsx
useEffect(() => {
  if (isOpen) {
    // Disable body scroll
    document.body.style.overflow = 'hidden';
    // Focus close button
    closeButtonRef.current?.focus();
  } else {
    // Re-enable body scroll
    document.body.style.overflow = '';
  }

  return () => {
    document.body.style.overflow = '';
  };
}, [isOpen]);
```

---

## Testing Strategy

### Manual Testing Checklist

#### Visual Testing
- [ ] **320px viewport** (iPhone SE)
  - Header fits without horizontal scroll
  - Logo readable
  - Hamburger icon clearly visible
  - Touch target ≥44px

- [ ] **375px viewport** (iPhone 12/13)
  - Same as 320px

- [ ] **414px viewport** (iPhone 14 Pro Max)
  - Same as 320px

- [ ] **768px viewport** (iPad portrait)
  - Hamburger visible (mobile view)

- [ ] **769px viewport** (iPad landscape / desktop)
  - Desktop header visible
  - Hamburger hidden
  - All buttons in main bar

#### Functional Testing
- [ ] Click hamburger → drawer opens
- [ ] Click overlay → drawer closes
- [ ] Click X button → drawer closes
- [ ] Navigate to login → drawer closes, navigates
- [ ] Navigate to signup → drawer closes, navigates
- [ ] Toggle theme → theme changes, drawer stays open
- [ ] Change language → language changes, drawer stays open
- [ ] Body scroll disabled when drawer open
- [ ] Body scroll re-enabled when drawer closes

#### Interaction Testing
- [ ] Tap hamburger (finger simulation)
- [ ] Tap close button
- [ ] Tap outside drawer (overlay)
- [ ] Swipe gesture (if implemented)
- [ ] Rapid open/close (no animation glitches)

#### Keyboard Testing
- [ ] Tab to hamburger → Enter to open
- [ ] Escape to close drawer
- [ ] Tab through drawer items
- [ ] Enter/Space on buttons
- [ ] Focus trapped in drawer when open
- [ ] Focus returns to hamburger when closed

#### Screen Reader Testing
- [ ] VoiceOver (iOS): announces "Navigation menu button"
- [ ] TalkBack (Android): announces correctly
- [ ] NVDA (Windows): announces correctly
- [ ] All interactive elements announced
- [ ] Dialog role recognized

#### Cross-Browser Testing
- [ ] Chrome mobile
- [ ] Safari iOS
- [ ] Firefox mobile
- [ ] Samsung Internet
- [ ] Chrome desktop (responsive mode)
- [ ] Safari desktop (responsive mode)

#### Dark Mode Testing
- [ ] Drawer colors correct in dark mode
- [ ] Overlay opacity appropriate
- [ ] Text readable
- [ ] Borders visible

### Automated Tests

#### Unit Tests

**File**: `frontend/src/components/layout/__tests__/PublicHeader.test.tsx`

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PublicHeader } from '../PublicHeader';

describe('PublicHeader - Mobile Menu', () => {
  it('shows hamburger menu on mobile viewport', () => {
    // Mock window.matchMedia for mobile
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    render(<PublicHeader />);

    const hamburger = screen.getByLabelText(/open menu/i);
    expect(hamburger).toBeInTheDocument();
    expect(hamburger).toBeVisible();
  });

  it('opens drawer when hamburger is clicked', async () => {
    render(<PublicHeader />);

    const hamburger = screen.getByLabelText(/open menu/i);
    fireEvent.click(hamburger);

    // Drawer should be visible
    const drawer = await screen.findByRole('dialog');
    expect(drawer).toBeInTheDocument();
    expect(drawer).toBeVisible();
  });

  it('closes drawer when close button is clicked', async () => {
    render(<PublicHeader />);

    // Open drawer
    fireEvent.click(screen.getByLabelText(/open menu/i));

    // Close drawer
    const closeButton = await screen.findByLabelText(/close menu/i);
    fireEvent.click(closeButton);

    // Drawer should be hidden
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes drawer when overlay is clicked', async () => {
    render(<PublicHeader />);

    // Open drawer
    fireEvent.click(screen.getByLabelText(/open menu/i));

    // Click overlay (backdrop)
    const overlay = screen.getByRole('dialog').previousSibling;
    fireEvent.click(overlay);

    // Drawer should be hidden
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides hamburger on desktop viewport', () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(min-width: 769px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    render(<PublicHeader />);

    const hamburger = screen.queryByLabelText(/open menu/i);
    expect(hamburger).not.toBeVisible(); // hidden by md:hidden
  });
});
```

#### Integration Tests

**File**: `frontend/src/components/layout/__tests__/MobileMenuContent.test.tsx`

```tsx
describe('MobileMenuContent', () => {
  it('renders all menu sections', () => {
    render(<MobileMenuContent onClose={jest.fn()} />);

    expect(screen.getByText(/settings/i)).toBeInTheDocument();
    expect(screen.getByText(/account/i)).toBeInTheDocument();
  });

  it('navigates to login and closes menu', () => {
    const mockNavigate = jest.fn();
    const mockClose = jest.fn();

    jest.mock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }));

    render(<MobileMenuContent onClose={mockClose} />);

    const loginButton = screen.getByText(/login/i);
    fireEvent.click(loginButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(mockClose).toHaveBeenCalled();
  });
});
```

#### E2E Tests (Playwright/Cypress)

```typescript
// e2e/mobile-menu.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mobile Hamburger Menu', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone size

  test('opens and closes menu on mobile', async ({ page }) => {
    await page.goto('/');

    // Hamburger should be visible
    const hamburger = page.getByLabel(/open menu/i);
    await expect(hamburger).toBeVisible();

    // Click to open
    await hamburger.click();

    // Drawer should appear
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    // Login button should be in drawer
    const loginBtn = drawer.getByText(/login/i);
    await expect(loginBtn).toBeVisible();

    // Close drawer
    await page.getByLabel(/close menu/i).click();
    await expect(drawer).not.toBeVisible();
  });

  test('drawer closes when clicking overlay', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel(/open menu/i).click();

    // Click outside drawer (on overlay)
    await page.locator('.fixed.inset-0.bg-black\\/50').click();

    // Drawer should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('navigates to login from drawer', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel(/open menu/i).click();
    await page.getByRole('dialog').getByText(/login/i).click();

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Desktop Header', () => {
  test.use({ viewport: { width: 1280, height: 720 } }); // Desktop size

  test('shows full header on desktop', async ({ page }) => {
    await page.goto('/');

    // Hamburger should NOT be visible
    const hamburger = page.getByLabel(/open menu/i);
    await expect(hamburger).not.toBeVisible();

    // Desktop buttons should be visible
    await expect(page.getByText(/login/i)).toBeVisible();
    await expect(page.getByText(/signup/i)).toBeVisible();
  });
});
```

---

## Internationalization

### Translation Keys

**Namespace**: `common`

**New Keys**:
```yaml
common:
  menu:
    title: "Menu"
    close: "Close menu"
    open: "Open menu"
  navigation:
    dashboard: "Dashboard"
    characters: "Characters"
    stories: "Stories"
  settings: "Settings"
  account: "Account"
  theme:
    title: "Theme"
    light: "Light"
    dark: "Dark"
  language:
    title: "Language"
```

**Files to Update**:
- `frontend/public/locales/en/common.json`
- `frontend/public/locales/pt/common.json`
- `frontend/public/locales/es/common.json`
- `frontend/public/locales/fr/common.json`
- ... (all 11 languages)

---

## Performance Considerations

### Bundle Size
- **Sheet/Drawer component**: ~2-3KB (if using headless UI)
- **Icons** (Menu, X): ~1KB
- **Total impact**: <5KB gzipped

### Lazy Loading (Optional)
```tsx
const Sheet = lazy(() => import('@/components/ui/Sheet'));
```

### Animation Performance
- Use CSS transforms (GPU-accelerated)
- `transform: translateX()` instead of `left` property
- `transition: transform 300ms ease-in-out`
- `will-change: transform` on drawer element

### Scroll Performance
- Disable body scroll when drawer open: `overflow: hidden`
- Use `position: fixed` on drawer overlay
- Avoid layout thrashing

---

## Rollout Strategy

### Phase 1: Implementation (1-2 days)
**Goal**: Build core functionality

**Tasks**:
1. Create/install Sheet component (2 hours)
2. Modify `PublicHeader.tsx` (2 hours)
3. Create `MobileMenuContent.tsx` (3 hours)
4. Add responsive breakpoints (1 hour)
5. Enhance ThemeToggle and LanguageSelector (2 hours)

**Acceptance**:
- [ ] Hamburger menu visible on mobile
- [ ] Drawer opens and closes
- [ ] All controls functional

### Phase 2: Polish & Accessibility (1 day)
**Goal**: Ensure quality and accessibility

**Tasks**:
1. Add ARIA labels and roles (2 hours)
2. Implement keyboard navigation (2 hours)
3. Add animations and transitions (2 hours)
4. Test across viewports (2 hours)

**Acceptance**:
- [ ] WCAG 2.1 AA compliant
- [ ] Smooth animations
- [ ] Works on all target viewports

### Phase 3: Testing & Launch (0.5 day)
**Goal**: Verify and deploy

**Tasks**:
1. Manual testing on real devices (2 hours)
2. Automated tests (if time permits) (2 hours)
3. Code review
4. Deploy to production

**Acceptance**:
- [ ] All manual tests pass
- [ ] No regressions on desktop
- [ ] Production deployment successful

---

## Success Metrics

### User Experience Metrics
- **Bounce Rate (Mobile)**: Target 40% reduction
- **Time to Signup (Mobile)**: Measure before/after
- **Error Rate**: <1% (drawer failures, navigation errors)

### Technical Metrics
- **Page Load Impact**: <50ms additional
- **Accessibility Score**: Lighthouse 100/100
- **Touch Target Compliance**: 100% ≥44px

### Engagement Metrics
- **Mobile Signups**: Track week-over-week growth
- **Mobile Session Duration**: Monitor improvement
- **Menu Usage**: Track drawer open rate

**Measurement Period**: 2 weeks post-launch

**Target**:
- Mobile bounce rate: 45% → 27%
- Mobile signup conversion: +15%
- Accessibility: 100/100 (Lighthouse)

---

## Future Enhancements

### Short-term (1-2 months)
- [ ] Add navigation links (Dashboard, Characters, Stories)
- [ ] User profile section in drawer (when authenticated)
- [ ] Notifications badge in drawer
- [ ] Swipe gesture to open drawer

### Medium-term (3-6 months)
- [ ] Search bar in drawer
- [ ] Recent activity section
- [ ] Quick actions (New Character, New Story)
- [ ] Customizable menu items (user preferences)

### Long-term (6-12 months)
- [ ] Native app-like navigation (bottom tab bar)
- [ ] Gesture-based navigation (swipe between sections)
- [ ] Progressive Web App (PWA) integration
- [ ] Offline mode indicators

---

## Dependencies

### UI Components
- Sheet/Drawer component (shadcn/ui, Headless UI, or custom)
- Icons: Menu, X (lucide-react or similar)
- Separator component (divider)

### Utilities
- `cn` utility for className merging
- React Router for navigation
- i18next for translations

### No New Dependencies Required
- Leverage existing UI library
- Use existing icon library
- No additional npm packages needed (ideally)

---

## Related Documentation

- **Public Header Component**: `frontend/src/components/layout/PublicHeader.tsx`
- **Theme Toggle**: `frontend/src/components/features/ThemeToggle.tsx`
- **Language Selector**: `frontend/src/components/features/LanguageSelector.tsx`
- **GitHub Issue**: [#61](https://github.com/leandro-br-dev/charhub/issues/61)

---

## Pull Request Template

**Title**: `feat: Responsive Mobile Hamburger Menu`

**Branch**: `feature/mobile-hamburger-menu`

**Description**:
```markdown
## Summary
Implements responsive mobile hamburger menu to fix header overcrowding on small screens (320-375px).

Fixes #61

## Changes
✨ **New Features**:
- Mobile hamburger menu with drawer/sheet
- Responsive breakpoint at 768px
- Full-width mobile controls (theme, language, auth)
- Smooth animations and transitions

🎨 **UI/UX**:
- Clean mobile header (logo + menu icon)
- Organized drawer sections (Settings, Auth)
- Touch targets ≥44px (WCAG 2.1 AA)
- Dark mode support

♿ **Accessibility**:
- Keyboard navigation (Tab, Escape)
- Screen reader support (ARIA labels)
- Focus management
- Focus trapping in drawer

## Technical Changes
**Components**:
- Modified: `PublicHeader.tsx` - added mobile/desktop responsive views
- New: `MobileMenuContent.tsx` - drawer content
- Modified: `ThemeToggle.tsx` - added full-width variant
- Modified: `LanguageSelector.tsx` - added full-width variant

**Dependencies**:
- Sheet component (shadcn/ui or custom)
- Icons: Menu, X

## Testing
- [x] Manual testing on 320px, 375px, 414px viewports
- [x] Desktop view unchanged (>768px)
- [x] Drawer opens/closes correctly
- [x] All controls functional in drawer
- [x] Keyboard navigation working
- [x] Screen reader tested (VoiceOver)
- [x] Dark mode verified
- [x] Cross-browser (Chrome, Safari, Firefox)
- [x] Touch targets ≥44px
- [ ] Automated tests (if time permits)

## Screenshots
[Add before/after screenshots of mobile header]
[Add screenshot of drawer opened]

## Accessibility
- ✅ WCAG 2.1 AA compliant
- ✅ Touch targets ≥44px
- ✅ Keyboard navigable
- ✅ Screen reader accessible
- ✅ Focus management

## Performance
- Bundle size impact: <5KB gzipped
- Page load impact: <50ms
- Animations: GPU-accelerated (transform)

## Migration Notes
- No breaking changes
- Desktop experience unchanged
- No database migrations
- No environment variables

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Notes for Agent Coder

### Implementation Priority
**HIGH** - This is a critical UX issue affecting mobile users (majority of traffic)

### Quick Win
- Low complexity (1-2 days)
- High impact (immediate UX improvement)
- No backend changes required
- Can be developed in parallel with other features

### Code Reuse
- Leverage existing UI components
- Reuse theme/language components
- Similar pattern to existing dialogs/modals

### Key Considerations
1. **Don't break desktop**: Use responsive classes carefully
2. **Accessibility first**: ARIA labels, keyboard nav, focus management
3. **Touch targets**: Ensure ≥44px for all interactive elements
4. **Performance**: Keep bundle size small, animations smooth
5. **Testing**: Test on real devices (at least iPhone and Android)

### Testing Priority
1. Visual testing on multiple viewports (most important)
2. Functional testing (open/close, navigation)
3. Accessibility testing (keyboard, screen reader)
4. Automated tests (nice to have, not blocking)

### Questions to Clarify
- Which UI library is currently used? (shadcn/ui, Headless UI, custom?)
- Drawer position preference? (left or right side?)
- Should navigation links be included now or later?
- Any specific animation preferences?

---

**End of Specification**

For questions or clarifications, consult Agent Planner or review GitHub Issue #61.

🚀 Ready for immediate implementation - this is a quick win!
