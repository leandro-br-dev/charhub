import { logger } from '../config/logger';
import { callLLM, LLMRequest } from '../services/llm';
import { Conversation, Message, ConversationParticipant } from '../generated/prisma';

// System prompt for the conversation manager
const CONVERSATION_MANAGER_PROMPT = `You are a conversation manager AI that determines which bots should respond to a user's message.

Your task:
1. Analyze the user's latest message
2. Review recent conversation history (last few messages)
3. Consider each bot's role, personality, and expertise
4. Decide which bot(s) should respond

Rules:
- A character bot (actingCharacterId) is designed to entertain and can talk about anything
- An assistant bot (actingAssistantId) has a specific function/expertise but can still chat casually
- If the message is general/casual, typically 1 bot responds
- If the message mentions specific bots by name or role, those bots should respond
- If multiple bots have relevant expertise, they can both respond
- At least 1 bot must always respond

Output ONLY a JSON array of participant IDs that should respond, like:
["participant-id-1", "participant-id-2"]

If only one bot should respond:
["participant-id-1"]`;

interface ParticipantInfo {
  id: string;
  type: 'character' | 'assistant';
  name: string;
  description?: string;
  personality?: string;
  contentScope?: string;
}

export class ConversationManagerAgent {
  /**
   * Analyzes a message and determines which bots should respond
   * @returns Array of participant IDs that should respond
   */
  async execute(
    conversation: Conversation & {
      participants: (ConversationParticipant & {
        actingCharacter?: any;
        actingAssistant?: any;
        representingCharacter?: any;
      })[];
      messages: Message[];
    },
    latestMessage: Message
  ): Promise<string[]> {
    logger.info(
      { conversationId: conversation.id, messageId: latestMessage.id },
      'Executing ConversationManagerAgent'
    );

    // Get only bot participants (exclude human users)
    const botParticipants = conversation.participants.filter(
      p => p.actingCharacterId || p.actingAssistantId
    );

    if (botParticipants.length === 0) {
      logger.warn({ conversationId: conversation.id }, 'No bot participants found');
      return [];
    }

    // If only one bot, it always responds
    if (botParticipants.length === 1) {
      logger.debug('Only one bot participant, auto-selecting');
      return [botParticipants[0].id];
    }

    // Build participant context
    const participantContext = botParticipants.map((p): ParticipantInfo => {
      if (p.actingAssistantId && p.actingAssistant) {
        // Assistant bot (may or may not have a character appearance)
        const character = p.representingCharacter;
        const contentScope = character?.contentTags?.length
          ? `May cover: ${character.contentTags.join(', ')}`
          : undefined;

        return {
          id: p.id,
          type: 'assistant',
          name: character?.firstName || p.actingAssistant.name,
          description: p.actingAssistant.description || undefined,
          contentScope,
        };
      } else if (p.actingCharacterId && p.actingCharacter) {
        const contentScope = p.actingCharacter.contentTags?.length
          ? `Prefers themes: ${p.actingCharacter.contentTags.join(', ')}`
          : undefined;
        // Character bot (entertainment/roleplay)
        return {
          id: p.id,
          type: 'character',
          name: p.actingCharacter.firstName,
          personality: p.actingCharacter.personality || undefined,
          contentScope,
        };
      }
      return {
        id: p.id,
        type: 'character',
        name: 'Unknown',
      };
    });

    // Get recent message history (last 10 messages)
    const recentMessages = conversation.messages.slice(-10);
    const historyContext = recentMessages
      .map(msg => {
        const participant = conversation.participants.find(p =>
          p.actingCharacterId === msg.senderId ||
          p.actingAssistantId === msg.senderId ||
          p.userId === msg.senderId
        );
        const senderName = this.getParticipantName(participant, msg.senderType);
        return `${senderName}: ${msg.content}`;
      })
      .join('\n');

    // Build the prompt
    const contextPrompt = `
Available bots in this conversation:
${participantContext.map(p => `- ID: ${p.id}
  Name: ${p.name}
  Type: ${p.type}
  ${p.description ? `Description: ${p.description}` : ''}
  ${p.personality ? `Personality: ${p.personality}` : ''}
  ${p.contentScope ? `Content scope: ${p.contentScope}` : 'Content scope: General conversation'}`).join('\n\n')}

Recent conversation history:
${historyContext || 'No previous messages'}

Latest user message:
${latestMessage.content}

Which bot(s) should respond? Output only the JSON array of participant IDs.`;

    try {
      const llmRequest: LLMRequest = {
        provider: 'gemini',
        model: 'gemini-2.0-flash-lite',
        systemPrompt: CONVERSATION_MANAGER_PROMPT,
        userPrompt: contextPrompt,
      };

      const response = await callLLM(llmRequest);

      // Parse the JSON response
      const cleanedResponse = response.content.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const selectedParticipants = JSON.parse(cleanedResponse) as string[];

      // Validate that returned IDs are valid
      const validIds = selectedParticipants.filter(id =>
        botParticipants.some(p => p.id === id)
      );

      if (validIds.length === 0) {
        logger.warn(
          { conversationId: conversation.id, response: cleanedResponse },
          'LLM returned no valid participants, defaulting to first bot'
        );
        return [botParticipants[0].id];
      }

      logger.info(
        { conversationId: conversation.id, selectedCount: validIds.length },
        'ConversationManagerAgent selected participants'
      );

      return validIds;
    } catch (error) {
      logger.error(
        { error, conversationId: conversation.id },
        'Error in ConversationManagerAgent, defaulting to first bot'
      );
      // Fallback: return first bot
      return [botParticipants[0].id];
    }
  }

  private getParticipantName(participant: any, senderType: string): string {
    if (senderType === 'USER') {
      return participant?.user?.displayName || 'User';
    }
    if (participant?.actingCharacter) {
      return participant.actingCharacter.firstName;
    }
    if (participant?.representingCharacter) {
      return participant.representingCharacter.firstName;
    }
    if (participant?.actingAssistant) {
      return participant.actingAssistant.name;
    }
    return 'Unknown';
  }
}
