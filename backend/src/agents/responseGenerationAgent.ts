import { logger } from '../config/logger';
import { callLLM, LLMRequest } from '../services/llm';
import {
  formatParticipantsForLLM,
  formatConversationHistoryForLLM,
} from '../utils/conversationFormatter';
import { Conversation, Message, User } from '../generated/prisma';
import { StyleGuideService } from './style-guides';
import { calculateAge, getLanguageName } from '../utils/agentUtils';

export class ResponseGenerationAgent {
  private styleGuideService = new StyleGuideService();

  /**
   * Formats user information for context in prompts
   */
  private formatUserContext(user: User): string {
    const contextParts: string[] = [];

    // Display name only (fullName is for invoicing, not chat)
    if (user.displayName) {
      contextParts.push(`- Name: ${user.displayName}`);
    }

    // Birth date and age
    if (user.birthDate) {
      const birthDate = new Date(user.birthDate);
      const age = calculateAge(birthDate);
      const formattedDate = birthDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      contextParts.push(`- Birth Date: ${formattedDate} (${age} years old)`);
    }

    // Gender
    if (user.gender) {
      contextParts.push(`- Gender: ${user.gender}`);
    }

    // Preferred language
    if (user.preferredLanguage) {
      const languageName = getLanguageName(user.preferredLanguage);
      contextParts.push(`- Preferred Language: ${languageName}`);
    }

    // If no information available
    if (contextParts.length === 0) {
      return '- No additional information available about the user';
    }

    return contextParts.join('\n');
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

    const userLanguage = getLanguageName(user.preferredLanguage);
    const userContext = this.formatUserContext(user);

    logger.debug({
      userId: user.id,
      displayName: user.displayName,
      birthDate: user.birthDate,
      gender: user.gender,
      preferredLanguage: user.preferredLanguage,
      formattedContext: userContext
    }, 'User context for character response');

    const styleGuidePrompt = this.styleGuideService.buildPrompt({
      ageRating: character.ageRating,
      contentFilters: character.contentTags,
    });

    const systemPrompt = `You are roleplaying as the character: ${characterName}.\n\nCharacter Details:\n- Physical Characteristics: ${character.physicalCharacteristics || 'Not specified.'}\n- Personality: ${character.personality || 'Not specified.'}\n- Main Attire: Not specified.\n- History: ${character.history || 'No history provided.'}\n\nUser Information (Person you're talking to):\n${userContext}\n\nAdditional Instructions for this Conversation (Override):\n${respondingParticipant.configOverride || ''}\n\nStyle Guide:\n${styleGuidePrompt}\n\nRelationship Memory (Current Context with ${user.displayName || 'User'}):\n// TODO: Implement memory\n\nRoleplay Guidelines:\n1. Stay true to the defined personality and history for ${characterName}.\n2. Your responses should be consistent with the information provided above and the conversation context.\n3. Interact with ${user.displayName || 'User'} naturally, engagingly, and believably as ${characterName}.\n4. You have access to the user's information above. Use this knowledge naturally in conversation when appropriate.\n5. CRITICAL INSTRUCTION: YOU MUST ONLY generate responses and actions for YOURSELF (${characterName}). NEVER write, narrate, or describe actions or dialogue for ${user.displayName || 'User'}. Focus solely on your own character's part in the interaction.\n6. LANGUAGE INSTRUCTION: ${user.displayName || 'User'}'s preferred language is ${userLanguage}. You MUST respond in ${userLanguage} unless ${user.displayName || 'User'} explicitly requests a response in a different language. This is CRITICAL - always match the language preference of ${user.displayName || 'User'}.\n7. FORMATTING INSTRUCTION: DO NOT prefix your response with your character name (like \"${characterName}:" or \"Naruto:\"). The UI already displays your name and avatar. Just write the response content directly.\n`;

    const llmRequest: LLMRequest = {
      provider: 'gemini', // Or determine dynamically
      model: 'gemini-2.5-flash-lite', // Or determine dynamically
      systemPrompt,
      userPrompt: `${conversationContext}\n\nLatest message:\n${lastMessage.content}\n\nRespond now as ${characterName}. Remember: DO NOT include \"${characterName}:\" at the start of your response.`,
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

    const userContext = this.formatUserContext(user);

    const systemPrompt = `You are ${assistantName}, an AI assistant.\n\nYour role and focus:\n${assistantDescription}\n\nUser Information (Person you're assisting):\n${userContext}\n\n${configOverride ? `Additional instructions for this conversation:\n${configOverride}\n` : ''}\n\nGuidelines:\n1. Stay focused on your area of expertise: ${assistantDescription}\n2. Be helpful, clear, and concise\n3. You can engage in casual conversation, but prioritize your main function\n4. You have access to the user's information above. Use this knowledge naturally when appropriate.\n5. Do not roleplay as the user (${user.displayName || 'User'})\n6. FORMATTING INSTRUCTION: DO NOT prefix your response with your name (like \"${assistantName}:\"). The UI already displays your name and avatar. Just write the response content directly.`;

    const llmRequest: LLMRequest = {
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      systemPrompt,
      userPrompt: `${conversationContext}\n\nLatest message:\n${lastMessage.content}\n\nRespond now as ${assistantName}. Remember: DO NOT include \"${assistantName}:\" at the start of your response.`,
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
   * Removes \"Name:\" or \"Name :\" prefix from the beginning of LLM responses
   * Handles various formats like \"Naruto:\", \"Naruto :\", \"Sakura Haruno:\", etc.
   */
  private removeNamePrefix(content: string, name: string): string {
    if (!content || !name) return content;

    // Trim the content first
    const trimmed = content.trim();

    // Create regex patterns to match various name prefix formats
    // Matches: \"Name:\", \"Name :\", \"FirstName LastName:\", etc.
    const patterns = [
      new RegExp(`^${this.escapeRegex(name)}\\s*:\s*`, 'i'),
      new RegExp(`^${this.escapeRegex(name.split(' ')[0])}\\s*:\s*`, 'i'), // First name only
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
    return str.replace(/[.*+?^${}()|[\\]/g, '\\$&');
  }
}
