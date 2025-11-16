
// frontend/src/pages/(chat)/shared/components/DisplayAvatarParticipants.tsx
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../../../components/ui/Avatar";
import { Button } from "../../../../components/ui/Button";

interface Participant {
  id: string;
  actorId: string;
  actorType: string;
  representation?: {
    name: string;
    avatar?: string;
  };
}

interface DisplayAvatarParticipantsProps {
  participants: Participant[];
  onAddClick?: () => void;
  onRemoveClick?: (participantId: string) => void;
  onAvatarClick?: (participant: Participant) => void;
  isSticky?: boolean;
}

const DisplayAvatarParticipants = React.memo(
  ({
    participants,
    onAddClick,
    onRemoveClick,
    onAvatarClick,
    isSticky = false,
  }: DisplayAvatarParticipantsProps) => {
    const { t } = useTranslation('chat');

    const displayableParticipants = useMemo(() => {
      return Array.isArray(participants)
        ? participants.filter((p) => p.actorType !== "USER" && p.representation)
        : [];
    }, [participants]);

    // Scalable avatar size based on participant count
    const avatarSize = useMemo(() => {
      if (isSticky) return "mini";
      // Single participant: larger avatar
      if (displayableParticipants.length === 1) return "xlarge";
      // Multiple participants: standard size
      return "large";
    }, [isSticky, displayableParticipants.length]);

    const layoutClasses = isSticky
      ? `flex items-center flex-wrap gap-1`
      : `flex justify-center items-center flex-wrap gap-3`;

    const avatarContent = useMemo(() => {
      if (!isSticky && displayableParticipants.length === 0) {
        return (
          <div className="text-center text-muted text-sm p-4 italic">
            {t("displayAvatarParticipants.addParticipantPrompt")}
          </div>
        );
      }
      return displayableParticipants.map((participant) => {
        const participantName =
          participant.representation?.name || t("common.unknown");
        return (
          <div
            key={participant.id || participant.actorId}
            className="relative group cursor-pointer"
            style={{ margin: isSticky ? '0 2px' : '0 4px' }}
            title={t("displayAvatarParticipants.configureParticipantTitle", {
              name: participantName,
            })}
            onClick={() => onAvatarClick && onAvatarClick(participant)}
          >
            <Avatar
              src={participant.representation?.avatar}
              alt={participantName}
              size={avatarSize as any} // Cast because the sizes don't match perfectly
            />
            {onRemoveClick && !isSticky && (
              <Button
                variant="danger"
                size="small"
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 z-10 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveClick(participant.id);
                }}
                icon="close"
                title={t("displayAvatarParticipants.removeParticipantTitle", {
                  name: participantName,
                })}
              />
            )}
          </div>
        );
      });
    }, [displayableParticipants, avatarSize, onRemoveClick, onAvatarClick, t, isSticky]);


    return (
      <div className={layoutClasses}>
        {avatarContent}
        {onAddClick && !isSticky && displayableParticipants.length < 4 && (
          <Button
            variant="light"
            size="small"
            icon="add"
            onClick={onAddClick}
            className="ml-2 flex-shrink-0 rounded-full p-2"
            title={t("displayAvatarParticipants.addParticipantButtonTitle")}
          />
        )}
      </div>
    );
  }
);

DisplayAvatarParticipants.displayName = "DisplayAvatarParticipants";
export default DisplayAvatarParticipants;
