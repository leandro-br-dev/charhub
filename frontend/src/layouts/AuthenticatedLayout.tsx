import { useEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NavigationRail, Sidebar } from "../components/layout";
import { Button } from "../components/ui/Button";

type NavigationSelection = {
  to: string;
  opensSidebar: boolean;
  available: boolean;
};

type AuthenticatedLayoutProps = {
  children?: ReactNode;
};

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps): JSX.Element {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

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
    setIsDrawerOpen((prev) => !prev);
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
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsDrawerOpen(false);
      } else {
        setIsDesktopSidebarOpen(true);
      }
    } else if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsDesktopSidebarOpen(false);
    }
  };

  const mainContent = children ?? <Outlet />;
  const isChatRoute = location.pathname.startsWith('/chat');

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <div
        ref={railRef}
        className={`hidden md:flex md:sticky md:top-0 md:h-screen md:z-40 ${
          !isDesktopSidebarOpen ? "border-r border-border" : ""
        }`}
      >
        <NavigationRail displayMode="permanent" onNavItemSelect={handleNavSelection} />
      </div>

      <div ref={sidebarRef} className="hidden md:flex md:sticky md:top-0 md:h-screen md:z-30">
        <Sidebar
          displayMode="permanent"
          isOpen={isDesktopSidebarOpen}
          onClose={() => setIsDesktopSidebarOpen(false)}
          activeView={activeSidebar}
        />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-40 flex transform transition-transform duration-300 md:hidden ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavigationRail displayMode="overlay" onNavItemSelect={handleNavSelection} />
        <Sidebar displayMode="overlay" onClose={closeDrawer} isOpen activeView={activeSidebar} />
      </div>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeDrawer} role="presentation" />
      ) : null}

      <div className="fixed left-4 top-4 z-50 md:hidden">
        <Button
          variant="light"
          size="small"
          icon={isDrawerOpen ? "close" : "menu"}
          onClick={toggleDrawer}
          aria-label={isDrawerOpen ? "Close navigation" : "Open navigation"}
          className="rounded-full"
        />
      </div>

      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 pb-20 md:px-8 md:py-12 md:pb-12">{mainContent}</div>
        </main>
      </div>

      
    </div>
  );
}
