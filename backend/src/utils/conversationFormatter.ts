import {
  ConversationParticipant,
  Character,
  User,
  Assistant,
  Message,
} from '../generated/prisma';

type ParticipantWithRelations = ConversationParticipant & {
  user?: User | null;
  actingCharacter?: Character | null;
  actingAssistant?: (Assistant & { defaultCharacter?: Character | null }) | null;
  representingCharacter?: Character | null;
};

type FormattedParticipant = {
  participantId: string;
  type: 'USER' | 'CHARACTER_BOT' | 'ASSISTANT';
  id: string;
  name: string;
  roleplaying_as?: string;
  description?: string;
  function?: string;
  persona?: string;
};

export function formatParticipantsForLLM(
  participants: ParticipantWithRelations[]
): FormattedParticipant[] {
  const formatted: FormattedParticipant[] = [];

  for (const p of participants) {
    const actorInfo: Partial<FormattedParticipant> = {
      participantId: p.id,
    };

    if (p.userId) {
      actorInfo.type = 'USER';
      actorInfo.id = p.userId;
      if (p.representingCharacter) {
        actorInfo.name = p.representingCharacter.firstName;
        actorInfo.roleplaying_as = p.representingCharacter.firstName;
      } else if (p.user) {
        actorInfo.name = p.user.displayName || `User (${p.userId.slice(0, 8)})`;
      } else {
        actorInfo.name = `User (${p.userId.slice(0, 8)})`;
      }
    } else if (p.actingCharacterId) {
      actorInfo.type = 'CHARACTER_BOT';
      if (p.actingCharacter) {
        actorInfo.id = p.actingCharacter.id;
        actorInfo.name = p.actingCharacter.firstName;
        actorInfo.description = p.actingCharacter.personality || undefined;
        if (p.actingCharacter.contentTags?.length) {
          actorInfo.function = `Comfortable with themes: ${p.actingCharacter.contentTags.join(', ')}`;
        }
      } else {
        actorInfo.id = p.actingCharacterId;
        actorInfo.name = `Unknown Character (${p.actingCharacterId.slice(0, 8)})`;
      }
    } else if (p.actingAssistantId) {
      actorInfo.type = 'ASSISTANT';
      if (p.actingAssistant) {
        actorInfo.id = p.actingAssistant.id;
        actorInfo.name = p.actingAssistant.name;
        actorInfo.function = p.actingAssistant.description || undefined;
        if (p.representingCharacter) {
          actorInfo.persona = p.representingCharacter.firstName;
        } else {
          actorInfo.persona = p.actingAssistant.name;
        }
      } else {
        actorInfo.id = p.actingAssistantId;
        actorInfo.name = `Unknown Assistant (${p.actingAssistantId.slice(0, 8)})`;
        actorInfo.persona = actorInfo.name;
      }
    }

    if (actorInfo.type && actorInfo.id && actorInfo.name) {
      formatted.push(actorInfo as FormattedParticipant);
    }
  }

  return formatted;
}

type FormattedMessage = {
  sender_name: string;
  content: string;
};

export function formatConversationHistoryForLLM(
  messages: Message[],
  participants: ParticipantWithRelations[]
): FormattedMessage[] {
  const idToDisplayNameMap = new Map<string, string>();

  for (const p of participants) {
    let actorEffectiveId: string | null = null;
    let displayName = `Unknown (${p.id.slice(0, 4)})`;

    if (p.userId) {
      actorEffectiveId = p.userId;
      if (p.representingCharacter?.firstName) {
        displayName = p.representingCharacter.firstName;
      } else if (p.user?.displayName) {
        displayName = p.user.displayName;
      } else {
        displayName = `User_${p.userId.slice(0, 4)}`;
      }
    } else if (p.actingCharacterId) {
      actorEffectiveId = p.actingCharacterId;
      if (p.actingCharacter?.firstName) {
        displayName = p.actingCharacter.firstName;
      } else {
        displayName = `Character_${p.actingCharacterId.slice(0, 4)}`;
      }
    } else if (p.actingAssistantId) {
      actorEffectiveId = p.actingAssistantId;
      if (p.representingCharacter?.firstName) {
        displayName = p.representingCharacter.firstName;
      } else if (p.actingAssistant?.name) {
        displayName = p.actingAssistant.name;
      } else {
        displayName = `Assistant_${p.actingAssistantId.slice(0, 4)}`;
      }
    }

    if (actorEffectiveId) {
      idToDisplayNameMap.set(actorEffectiveId, displayName);
    }
  }

  const formattedHistory: FormattedMessage[] = [];
  for (const msg of messages) {
    const senderNameForHistory =
      idToDisplayNameMap.get(msg.senderId) || `Unknown_${msg.senderId.slice(0, 4)}`;

    formattedHistory.push({
      sender_name: senderNameForHistory,
      content: msg.content,
    });
  }

  return formattedHistory;
}
