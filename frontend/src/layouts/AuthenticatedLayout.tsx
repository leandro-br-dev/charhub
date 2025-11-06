import { useEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NavigationRail, Sidebar } from "../components/layout";
import { PageHeader } from "../components/ui";
import { PageHeaderProvider, usePageHeader } from "../hooks/usePageHeader";

type NavigationSelection = {
  to: string;
  opensSidebar: boolean;
  available: boolean;
};

type AuthenticatedLayoutProps = {
  children?: ReactNode;
};

function AuthenticatedLayoutInner({ children }: AuthenticatedLayoutProps): JSX.Element {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const { title, actions } = usePageHeader();

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Prevent background scroll on mobile while the drawer is open
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile) return;

    if (isDrawerOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevOverscroll = (document.body.style as any).overscrollBehavior;
      const prevTouchAction = (document.body.style as any).touchAction;

      document.body.style.overflow = 'hidden';
      (document.body.style as any).overscrollBehavior = 'none';
      (document.body.style as any).touchAction = 'none';

      return () => {
        document.body.style.overflow = prevOverflow;
        (document.body.style as any).overscrollBehavior = prevOverscroll;
        (document.body.style as any).touchAction = prevTouchAction;
      };
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDesktopSidebarOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        return;
      }

      const target = event.target as Node;
      if (sidebarRef.current?.contains(target) || railRef.current?.contains(target)) {
        return;
      }

      setIsDesktopSidebarOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDesktopSidebarOpen]);

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => {
      const newIsOpen = !prev;
      if (newIsOpen && !activeSidebar) {
        setActiveSidebar('/chat');
      }
      return newIsOpen;
    });
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleNavSelection = (selection: NavigationSelection) => {
    if (!selection.available) {
      return;
    }

    if (selection.opensSidebar) {
      if (isDesktopSidebarOpen && activeSidebar === selection.to) {
        setIsDesktopSidebarOpen(false);
        return;
      }

      setActiveSidebar(selection.to);
      // On desktop, open the contextual sidebar. On mobile, keep the drawer open.
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        setIsDesktopSidebarOpen(true);
      }
    } else if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsDesktopSidebarOpen(false);
    }
  };

  const mainContent = children ?? <Outlet />;
  const isDashboardRoute = location.pathname === '/dashboard';
  // Hide content filter in active chat conversations (but show in chat list)
  const isActiveChatRoute = /^\/chat\/[^/]+$/.test(location.pathname);
  // Check if it's the new chat page
  const isNewChatRoute = location.pathname === '/chat/new';

  return (
    <div
      className="relative flex min-h-[100svh] bg-background text-foreground"
      data-sidebar-open={isDesktopSidebarOpen ? 'true' : 'false'}
    >
      <div
        ref={railRef}
        className={`hidden md:flex md:sticky md:top-0 md:h-[100svh] md:z-50 ${
          !isDesktopSidebarOpen ? "border-r border-border" : ""
        }`}
      >
        <NavigationRail displayMode="permanent" onNavItemSelect={handleNavSelection} activeItem={activeSidebar} />
      </div>

      <div ref={sidebarRef} className="hidden md:flex md:sticky md:top-0 md:h-[100svh] md:z-30">
        <Sidebar
          displayMode="permanent"
          isOpen={isDesktopSidebarOpen}
          onClose={() => setIsDesktopSidebarOpen(false)}
          activeView={activeSidebar}
        />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-40 flex transform transition-transform duration-300 md:hidden h-[100svh] overflow-hidden overscroll-none touch-none ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavigationRail displayMode="overlay" onNavItemSelect={handleNavSelection} activeItem={activeSidebar} />
        <Sidebar displayMode="overlay" onClose={closeDrawer} isOpen activeView={activeSidebar} />
      </div>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeDrawer} role="presentation" />
      ) : null}

      <div className="flex flex-1 flex-col">
        <PageHeader
          title={title}
          actions={actions}
          showBackButton={!isDashboardRoute}
          showHomeButton
          showContentFilter={!isActiveChatRoute}
          showMobileMenu
          isMobileMenuOpen={isDrawerOpen}
          onMobileMenuToggle={toggleDrawer}
          isChatRoute={isActiveChatRoute}
        />

        <main className={`flex-1 ${isActiveChatRoute || isNewChatRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {isActiveChatRoute || isNewChatRoute ? (
            <div className="h-full">{mainContent}</div>
          ) : (
            <div className={`mx-auto w-full ${isDashboardRoute ? '' : 'max-w-6xl px-4 md:px-8'} ${isDashboardRoute ? 'py-0' : 'py-8 pb-20 md:py-12 md:pb-12'}`}>{mainContent}</div>
          )}
        </main>
      </div>


    </div>
  );
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps): JSX.Element {
  return (
    <PageHeaderProvider>
      <AuthenticatedLayoutInner>{children}</AuthenticatedLayoutInner>
    </PageHeaderProvider>
  );
}
