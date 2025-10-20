import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { ConversationHistory } from "../../pages/(chat)/shared/components/ConversationHistory";
import { CharacterListSidebar } from "./CharacterListSidebar";

type SidebarProps = {
  onClose?: () => void;
  displayMode?: "permanent" | "overlay";
  isOpen?: boolean;
  activeView?: string | null;
};

type PlaceholderPanelProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

function PlaceholderPanel({ title, description, actions }: PlaceholderPanelProps): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col gap-4 py-6">
      <div className="px-6">
        <h2 className="text-base font-semibold text-content">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      {actions ? <div className="mt-auto flex flex-wrap gap-3 px-6">{actions}</div> : null}
    </div>
  );
}

export function Sidebar({ onClose, displayMode = "permanent", isOpen = false, activeView }: SidebarProps): JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation(["navigation", "dashboard", "common"]);

  const handleLinkClick = () => {
    onClose?.();
  };

  const handleCreateCharacter = () => {
    handleLinkClick();
    navigate("/characters/create");
  };

  let content: ReactNode;

  if (activeView?.startsWith("/chat")) {
    content = (
      <div className="flex h-full w-full flex-col">
        <ConversationHistory onLinkClick={handleLinkClick} />
      </div>
    );
  } else if (activeView?.startsWith("/development")) {
    content = (
      <div className="flex h-full w-full flex-col">
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
    activeView?.startsWith("/characters") ||
    activeView?.startsWith("/manage") ||
    activeView?.startsWith("/profile") ||
    activeView?.startsWith("/credits-plans")
  ) {
    content = (
      <div className="flex h-full w-full flex-col">
        <CharacterListSidebar onLinkClick={handleLinkClick} />
        <div className="mt-auto flex flex-col gap-2 p-4">
          <Button variant="primary" icon="add" onClick={handleCreateCharacter}>
            {t("dashboard:createCharacter", "Create character")}
          </Button>
          <Button
            variant="secondary"
            icon="groups"
            onClick={() => {
              handleLinkClick();
              navigate("/characters");
            }}
          >
            {t("navigation:viewAllCharacters", "View all characters")}
          </Button>
        </div>
      </div>
    );
  } else if (activeView?.startsWith("/story")) {
    content = (
      <div className="flex h-full w-full flex-col">
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
      ? "flex h-screen w-80 flex-shrink-0 border-r border-border bg-normal/90 backdrop-blur md:hidden dark:bg-dark/80 dark:border-slate-800/80"
      : "hidden md:flex md:h-screen md:w-80 md:flex-shrink-0 md:border-r md:border-border md:bg-light/90 md:backdrop-blur md:sticky md:top-0 dark:md:bg-dark/80 dark:md:border-slate-800/80";

  return <aside className={containerClassName}>{content}</aside>;
}
