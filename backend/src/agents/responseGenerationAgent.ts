import { logger } from '../config/logger';
import { callLLM, LLMRequest } from '../services/llm';
import {
  formatParticipantsForLLM,
  formatConversationHistoryForLLM,
} from '../utils/conversationFormatter';
import { Conversation, Message, User } from '../generated/prisma';

// TODO: Move prompts to a dedicated prompt service
const CHARACTER_ROLEPLAY_PROMPT = `You are roleplaying as the character: {character_name}.

Character Details:
- Physical Characteristics: {physical_characteristics}
- Personality: {personality}
- Main Attire: {main_attire_description}
- History: {character_history}
- Preferred Themes (based on age rating {character_age_rating}): {character_content_scope}

Additional Instructions for this Conversation (Override):
{override_instructions}

Relationship Memory (Current Context with {user_display_name}):
{memory_context}

Roleplay Guidelines:
1. Stay true to the defined personality and history for {character_name}.
2. Your responses should be consistent with the information provided above and the conversation context.
3. Interact with {user_display_name} naturally, engagingly, and believably as {character_name}.
4. CRITICAL INSTRUCTION: YOU MUST ONLY generate responses and actions for YOURSELF ({character_name}). NEVER write, narrate, or describe actions or dialogue for {user_display_name}. Focus solely on your own character's part in the interaction.
5. LANGUAGE INSTRUCTION: {user_display_name}'s preferred language is {user_language}. You MUST respond in {user_language} unless {user_display_name} explicitly requests a response in a different language. This is CRITICAL - always match the language preference of {user_display_name}.
6. FORMATTING INSTRUCTION: DO NOT prefix your response with your character name (like "{character_name}:" or "Naruto:"). The UI already displays your name and avatar. Just write the response content directly.
`;

export class ResponseGenerationAgent {
  /**
   * Maps ISO 639-1 language codes to human-readable language names
   */
  private getLanguageName(languageCode?: string | null): string {
    if (!languageCode) return 'English';

    const languageMap: Record<string, string> = {
      'en': 'English',
      'pt': 'Portuguese',
      'pt-BR': 'Portuguese (Brazil)',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'zh-CN': 'Chinese (Simplified)',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
    };

    return languageMap[languageCode] || languageCode;
  }

  async execute(
    conversation: Conversation & { participants: any[]; messages: Message[] },
    user: User,
    lastMessage: Message,
    participantId?: string
  ): Promise<string> {
    logger.info(
      { conversationId: conversation.id, participantId },
      'Executing ResponseGenerationAgent'
    );

    const formattedParticipants = formatParticipantsForLLM(conversation.participants);
    const formattedHistory = formatConversationHistoryForLLM(
      conversation.messages,
      conversation.participants
    );

    // Find the specific participant that should respond
    // If participantId is provided, use it; otherwise fall back to first bot
    const respondingParticipant = participantId
      ? conversation.participants.find((p) => p.id === participantId)
      : conversation.participants.find(
          (p) => p.actingCharacterId || p.actingAssistantId
        );

    if (!respondingParticipant) {
      throw new Error(
        participantId
          ? `Participant ${participantId} not found in conversation`
          : 'No bot participant found in conversation'
      );
    }

    logger.debug(
      {
        conversationId: conversation.id,
        participantId: respondingParticipant.id,
        characterId: respondingParticipant.actingCharacterId,
        assistantId: respondingParticipant.actingAssistantId
      },
      'Selected participant for response'
    );

    // Determine character for roleplay:
    // - For assistants: use representingCharacter (if set)
    // - For characters: use actingCharacter
    const character = respondingParticipant.representingCharacter ||
                      respondingParticipant.actingCharacter;

    if (!character) {
      // If it's an assistant without a character, use assistant info
      if (respondingParticipant.actingAssistant) {
        const assistant = respondingParticipant.actingAssistant;
        // Build a basic personality from assistant description
        const characterName = assistant.name;
        const personality = assistant.description || 'Helpful AI assistant';

        return this.generateResponseWithoutCharacter(
          formattedParticipants,
          formattedHistory,
          lastMessage,
          user,
          characterName,
          personality,
          respondingParticipant.configOverride || ''
        );
      }

      throw new Error('No character or assistant found for this participant');
    }

    const characterName = character.firstName || 'Character';

    const participantsContext = formattedParticipants
      .map((participant) => {
        const details = [
          `${participant.type}: ${participant.name}`,
          participant.roleplaying_as ? `roleplaying as ${participant.roleplaying_as}` : null,
          participant.description ? `description: ${participant.description}` : null,
          participant.function ? `function: ${participant.function}` : null,
          participant.persona ? `persona: ${participant.persona}` : null,
        ].filter(Boolean);

        return `- ${details.join(', ')}`;
      })
      .join('\n');

    const historyContext = formattedHistory
      .map((entry) => `${entry.sender_name}: ${entry.content}`)
      .join('\n');

    const conversationContext = [
      'Participants:',
      participantsContext || 'No participants context available.',
      '',
      'Conversation history:',
      historyContext || 'No previous messages.',
    ].join('\n');

    const userLanguage = this.getLanguageName(user.preferredLanguage);

    const systemPrompt = CHARACTER_ROLEPLAY_PROMPT.replace(
      /{character_name}/g,
      character.firstName
    )
      .replace(/{physical_characteristics}/g, character.physicalCharacteristics || 'Not specified.')
      .replace(/{personality}/g, character.personality || 'Not specified.')
      .replace(/{main_attire_description}/g, 'Not specified.') // TODO: Get attire description
      .replace(/{character_history}/g, character.history || 'No history provided.')
      .replace(/{character_age_rating}/g, character.ageRating || 'L')
      .replace(/{character_content_scope}/g, this.describeContentScope(character.contentTags))
      .replace(/{override_instructions}/g, respondingParticipant.configOverride || '')
      .replace(/{user_display_name}/g, user.displayName || 'User')
      .replace(/{user_language}/g, userLanguage)
      .replace(/{memory_context}/g, ''); // TODO: Implement memory

    const llmRequest: LLMRequest = {
      provider: 'gemini', // Or determine dynamically
      model: 'gemini-2.5-flash-lite', // Or determine dynamically
      systemPrompt,
      userPrompt: `${conversationContext}\n\nLatest message:\n${lastMessage.content}\n\nRespond now as ${characterName}. Remember: DO NOT include "${characterName}:" at the start of your response.`,
    };

    try {
      const llmResponse = await callLLM(llmRequest);
      // Post-process: Remove character name prefix if LLM still added it
      return this.removeNamePrefix(llmResponse.content, characterName);
    } catch (error) {
      logger.error({ error }, 'Error calling LLM in ResponseGenerationAgent');
      throw error;
    }
  }

  private describeContentScope(contentTags?: string[]): string {
    if (!contentTags || contentTags.length === 0) {
      return 'Family-friendly topics only';
    }
    return contentTags.join(', ');
  }

  /**
   * Generate response for assistant without character (pure functional assistant)
   */
  private async generateResponseWithoutCharacter(
    formattedParticipants: any[],
    formattedHistory: any[],
    lastMessage: Message,
    user: User,
    assistantName: string,
    assistantDescription: string,
    configOverride: string
  ): Promise<string> {
    const participantsContext = formattedParticipants
      .map((p) => `- ${p.type}: ${p.name}`)
      .join('\n');

    const historyContext = formattedHistory
      .map((entry) => `${entry.sender_name}: ${entry.content}`)
      .join('\n');

    const conversationContext = [
      'Participants:',
      participantsContext || 'No participants context available.',
      '',
      'Conversation history:',
      historyContext || 'No previous messages.',
    ].join('\n');

    const systemPrompt = `You are ${assistantName}, an AI assistant.

Your role and focus:
${assistantDescription}

${configOverride ? `Additional instructions for this conversation:\n${configOverride}\n` : ''}

Guidelines:
1. Stay focused on your area of expertise: ${assistantDescription}
2. Be helpful, clear, and concise
3. You can engage in casual conversation, but prioritize your main function
4. Do not roleplay as the user (${user.displayName || 'User'})
5. FORMATTING INSTRUCTION: DO NOT prefix your response with your name (like "${assistantName}:"). The UI already displays your name and avatar. Just write the response content directly.`;

    const llmRequest: LLMRequest = {
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      systemPrompt,
      userPrompt: `${conversationContext}\n\nLatest message:\n${lastMessage.content}\n\nRespond now as ${assistantName}. Remember: DO NOT include "${assistantName}:" at the start of your response.`,
    };

    try {
      const llmResponse = await callLLM(llmRequest);
      // Post-process: Remove assistant name prefix if LLM still added it
      return this.removeNamePrefix(llmResponse.content, assistantName);
    } catch (error) {
      logger.error({ error }, 'Error calling LLM for assistant without character');
      throw error;
    }
  }

  /**
   * Removes "Name:" or "Name :" prefix from the beginning of LLM responses
   * Handles various formats like "Naruto:", "Naruto :", "Sakura Haruno:", etc.
   */
  private removeNamePrefix(content: string, name: string): string {
    if (!content || !name) return content;

    // Trim the content first
    const trimmed = content.trim();

    // Create regex patterns to match various name prefix formats
    // Matches: "Name:", "Name :", "FirstName LastName:", etc.
    const patterns = [
      new RegExp(`^${this.escapeRegex(name)}\\s*:\\s*`, 'i'),
      new RegExp(`^${this.escapeRegex(name.split(' ')[0])}\\s*:\\s*`, 'i'), // First name only
    ];

    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        const cleaned = trimmed.replace(pattern, '').trim();
        logger.debug(
          { original: trimmed.substring(0, 50), cleaned: cleaned.substring(0, 50), name },
          'Removed name prefix from LLM response'
        );
        return cleaned;
      }
    }

    return trimmed;
  }

  /**
   * Escapes special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
