import { logger } from '../config/logger';
import { callLLM, LLMRequest } from '../services/llm';
import { trackFromLLMResponse } from '../services/llm/llmUsageTracker';
import { Conversation, Message, ConversationParticipant } from '../generated/prisma';

// System prompt for the conversation manager
const CONVERSATION_MANAGER_PROMPT = `You are a conversation manager AI that determines which bots should respond to a user's message and classifies content.

Your task:
1. Analyze the user's latest message
2. Review recent conversation history (last few messages)
3. Consider each bot's role, personality, and expertise
4. Decide which bot(s) should respond
5. Classify if the conversation content is NSFW (Not Safe For Work)

Rules:
- A character bot (actingCharacterId) is designed to entertain and can talk about anything
- An assistant bot (actingAssistantId) has a specific function/expertise but can still chat casually
- If the message is general/casual, typically 1 bot responds
- If the message mentions specific bots by name or role, those bots should respond
- If multiple bots have relevant expertise, they can both respond
- At least 1 bot must always respond

NSFW Classification:
- NSFW includes: sexual content, explicit romantic content, adult themes, violence, gore, drug use
- SFW (Safe For Work) includes: general conversation, casual topics, normal roleplay without adult themes

Output ONLY a JSON object with this exact structure:
{
  "participantIds": ["participant-id-1", "participant-id-2"],
  "isNSFW": false
}

Example for single bot responding with safe content:
{
  "participantIds": ["participant-id-1"],
  "isNSFW": false
}

Example for NSFW content:
{
  "participantIds": ["participant-id-1"],
  "isNSFW": true
}`;

interface ParticipantInfo {
  id: string;
  type: 'character' | 'assistant';
  name: string;
  description?: string;
  personality?: string;
  contentScope?: string;
}

export interface ConversationManagerResult {
  participantIds: string[];
  isNSFW: boolean;
}

export class ConversationManagerAgent {
  /**
   * Analyzes a message and determines which bots should respond and if content is NSFW
   * @returns Object with participant IDs and NSFW flag
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
  ): Promise<ConversationManagerResult> {
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
      return { participantIds: [], isNSFW: false };
    }

    // If only one bot, it always responds (analyze content for NSFW anyway)
    if (botParticipants.length === 1) {
      logger.debug('Only one bot participant, checking NSFW status');

      // Quick NSFW check for single bot case
      const isNSFW = await this.checkContentNSFW(conversation, latestMessage);

      return {
        participantIds: [botParticipants[0].id],
        isNSFW
      };
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
      logger.debug(
        { conversationId: conversation.id, participantCount: participantContext.length },
        'Calling LLM for bot selection'
      );

      const llmRequest: LLMRequest = {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        systemPrompt: CONVERSATION_MANAGER_PROMPT,
        userPrompt: contextPrompt,
      };

      const response = await callLLM(llmRequest);

      // Track LLM usage for cost analysis
      trackFromLLMResponse(response, {
        userId: conversation.userId,
        feature: 'CHAT_MESSAGE',
        featureId: conversation.id,
        operation: 'bot_selection',
      });

      logger.debug(
        { conversationId: conversation.id, rawResponse: response.content },
        'LLM response received'
      );

      // Parse the JSON response
      const cleanedResponse = response.content.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      logger.debug(
        { conversationId: conversation.id, cleanedResponse },
        'Cleaned LLM response'
      );

      const result = JSON.parse(cleanedResponse) as ConversationManagerResult;

      logger.debug(
        { conversationId: conversation.id, result },
        'Parsed conversation manager result'
      );

      // Validate that returned IDs are valid
      const validIds = result.participantIds.filter(id =>
        botParticipants.some(p => p.id === id)
      );

      if (validIds.length === 0) {
        logger.warn(
          { conversationId: conversation.id, response: cleanedResponse, availableIds: botParticipants.map(p => p.id) },
          'LLM returned no valid participants, defaulting to first bot'
        );
        return {
          participantIds: [botParticipants[0].id],
          isNSFW: result.isNSFW || false
        };
      }

      logger.info(
        { conversationId: conversation.id, selectedCount: validIds.length, validIds, isNSFW: result.isNSFW },
        'ConversationManagerAgent selected participants and classified content'
      );

      return {
        participantIds: validIds,
        isNSFW: result.isNSFW || false
      };
    } catch (error) {
      logger.error(
        { error, conversationId: conversation.id, errorMessage: error instanceof Error ? error.message : String(error), errorStack: error instanceof Error ? error.stack : undefined },
        'Error in ConversationManagerAgent, defaulting to first bot'
      );
      // Fallback: return first bot with safe assumption
      return {
        participantIds: [botParticipants[0].id],
        isNSFW: false
      };
    }
  }

  /**
   * Quick NSFW check for content
   */
  private async checkContentNSFW(
    conversation: Conversation & { messages: Message[] },
    latestMessage: Message
  ): Promise<boolean> {
    try {
      // Get recent messages for context
      const recentMessages = conversation.messages.slice(-5);
      const conversationContext = recentMessages
        .map(msg => msg.content)
        .join('\n');

      const nsfwCheckPrompt = `Analyze this conversation and determine if it contains NSFW content.

NSFW includes: sexual content, explicit romantic content, adult themes, violence, gore, drug use.
SFW includes: general conversation, casual topics, normal roleplay without adult themes.

Recent conversation:
${conversationContext}

Latest message:
${latestMessage.content}

Respond with ONLY "true" if NSFW or "false" if SFW.`;

      const llmRequest: LLMRequest = {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        systemPrompt: 'You are a content classifier. Respond only with "true" or "false".',
        userPrompt: nsfwCheckPrompt,
      };

      const response = await callLLM(llmRequest);

      // Track LLM usage for cost analysis
      trackFromLLMResponse(response, {
        userId: conversation.userId,
        feature: 'CHAT_MESSAGE',
        featureId: conversation.id,
        operation: 'nsfw_check',
      });

      const cleanedResponse = response.content.trim().toLowerCase();

      return cleanedResponse.includes('true');
    } catch (error) {
      logger.error({ error }, 'Error checking NSFW status, defaulting to false');
      return false;
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
