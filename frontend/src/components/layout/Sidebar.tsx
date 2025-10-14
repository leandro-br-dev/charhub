import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { ConversationHistory } from "../../pages/(chat)/shared/components/ConversationHistory";

type SidebarProps = {
  onClose?: () => void;
  displayMode?: "permanent" | "overlay";
  isOpen?: boolean;
};

type PlaceholderPanelProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

function PlaceholderPanel({ title, description, actions }: PlaceholderPanelProps): JSX.Element {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h2 className="text-base font-semibold text-content">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      {actions ? <div className="mt-auto flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function Sidebar({ onClose, displayMode = "permanent", isOpen = false }: SidebarProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(["navigation", "dashboard", "common"]);

  const closeIfMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onClose?.();
    }
  };

  const handleCreateCharacter = () => {
    closeIfMobile();
    navigate("/characters/create");
  };

  const { pathname } = location;

  let content: ReactNode;

  if (pathname.startsWith("/chat")) {
    content = (
      <div className="flex h-full flex-col">
        <ConversationHistory onLinkClick={closeIfMobile} />
      </div>
    );
  } else if (pathname.startsWith("/development")) {
    content = (
      <div className="flex h-full flex-col">
        {/* TODO(development): render <DevSidebarContent /> with build queue summaries. */}
        <PlaceholderPanel
          title={t("navigation:developmentTools", "Developer tools")}
          description={t(
            "navigation:developmentPlaceholder",
            "Build pipelines, logs and automation controls will live here soon."
          )}
        />
      </div>
    );
  } else if (
    pathname.startsWith("/characters") ||
    pathname.startsWith("/manage") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/credits-plans")
  ) {
    content = (
      <div className="flex h-full flex-col">
        {/* TODO(characters): replace placeholder with <CharacterListSidebar onLinkClick={closeIfMobile} /> once migrated. */}
        <PlaceholderPanel
          title={t("navigation:characterSidebar", "Characters overview")}
          description={t(
            "navigation:characterSidebarPlaceholder",
            "Browse and pin your favourite characters here as soon as the hub sidebar is rebuilt."
          )}
          actions={
            <Button variant="primary" icon="add" onClick={handleCreateCharacter}>
              {t("dashboard:createCharacter", "Create character")}
            </Button>
          }
        />
      </div>
    );
  } else if (pathname.startsWith("/story")) {
    content = (
      <div className="flex h-full flex-col">
        {/* TODO(story): render <StorySidebarContent /> with drafts and chapters. */}
        <PlaceholderPanel
          title={t("navigation:storySidebar", "Stories")}
          description={t(
            "navigation:storySidebarPlaceholder",
            "Keep drafts and chapter outlines here once the storytelling suite is migrated."
          )}
        />
      </div>
    );
  } else {
    content = (
      <PlaceholderPanel
        title={t("navigation:sidebarDefaultTitle", "Explore CharHub")}
        description={t(
          "navigation:sidebarDefaultDescription",
          "Use the icons on the navigation rail to switch between experiences."
        )}
      />
    );
  }

  if (displayMode === "permanent" && !isOpen) {
    return (
      <aside
        className="hidden h-screen w-0 md:flex md:pointer-events-none"
        aria-hidden="true"
      />
    );
  }

  const containerClassName =
    displayMode === "overlay"
      ? "flex h-screen w-80 flex-shrink-0 border-r border-dark/40 bg-light/90 backdrop-blur md:hidden"
      : "hidden md:flex md:h-screen md:w-80 md:flex-shrink-0 md:border-r md:border-dark/40 md:bg-light/90 md:backdrop-blur md:sticky md:top-0";

  return <aside className={containerClassName}>{content}</aside>;
}
