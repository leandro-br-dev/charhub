import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/Button";

type AssetListSidebarProps = {
  onLinkClick?: () => void;
};

export function AssetListSidebar({ onLinkClick }: AssetListSidebarProps): JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation(["assets", "navigation", "common"]);

  const handleCreateAsset = () => {
    onLinkClick?.();
    navigate("/assets/create");
  };

  const handleNavigateToHub = () => {
    onLinkClick?.();
    navigate("/assets/hub");
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-col gap-4 py-6">
        <div className="px-6">
          <h2 className="text-base font-semibold text-content">
            {t("assets:hub.title", "Assets")}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t("assets:hub.sidebar.description", "Browse and manage your creative assets.")}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 p-4">
        <Button
          variant="primary"
          icon="add"
          onClick={handleCreateAsset}
        >
          {t("assets:hub.actions.newAsset", "New Asset")}
        </Button>
        <Button
          variant="secondary"
          icon="inventory_2"
          onClick={handleNavigateToHub}
        >
          {t("assets:hub.sidebar.viewGallery", "View Gallery")}
        </Button>
      </div>
    </div>
  );
}
