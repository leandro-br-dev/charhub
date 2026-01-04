import { logger } from '../config/logger';
import { callLLM, LLMRequest } from '../services/llm';
import { trackFromLLMResponse } from '../services/llm/llmUsageTracker';
import {
  formatParticipantsForLLM,
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
    participantId?: string,
    preferredLanguageOverride?: string,
    allUsers?: Map<string, User>  // Map of userId -> User for all participants
  ): Promise<string> {
    logger.info(
      { conversationId: conversation.id, participantId },
      'Executing ResponseGenerationAgent'
    );

    const formattedParticipants = formatParticipantsForLLM(conversation.participants);

    // Build context using memory compression system
    // This returns: Compressed history (30% of tokens) + Last 10 messages
    const { memoryService } = await import('../services/memoryService');
    const historyContext = await memoryService.buildContextWithMemory(conversation.id);

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
          historyContext,
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

    // historyContext is already built above using memory system

    // Extract story context from conversation settings if available
    let storyContext = '';
    if (conversation.settings && typeof conversation.settings === 'object') {
      const settings = conversation.settings as any;
      if (settings.storyContext) {
        storyContext = `\n\nSTORY CONTEXT:\n${settings.storyContext}\n`;
      }
    }

    const conversationContext = [
      'Participants:',
      participantsContext || 'No participants context available.',
      '',
      'Conversation history:',
      historyContext || 'No previous messages.',
      storyContext,
    ].join('\n');

    // Use override language if provided (from x-user-language header), otherwise use user's database preference
    const effectiveLanguageCode = preferredLanguageOverride || user.preferredLanguage;
    const userLanguage = getLanguageName(effectiveLanguageCode);

    // Format context for all users in multi-user conversations
    let allUsersContext = '';
    let lastMessageSender = user.displayName || 'User';

    if (allUsers && allUsers.size > 1) {
      // Multi-user conversation: format all users
      const userContexts: string[] = [];
      allUsers.forEach((u, userId) => {
        userContexts.push(`\n**${u.displayName || 'User'}** (ID: ${userId.slice(0, 8)}):\n${this.formatUserContext(u)}`);

        // Check if this user sent the last message
        if (lastMessage.senderId === userId) {
          lastMessageSender = u.displayName || 'User';
        }
      });
      allUsersContext = '\n\nAll Users in this Conversation:' + userContexts.join('\n');
    } else {
      // Solo conversation: use single user context
      allUsersContext = '\n\nUser Information (Person you\'re talking to):\n' + this.formatUserContext(user);
    }

    logger.debug({
      userId: user.id,
      displayName: user.displayName,
      birthDate: user.birthDate,
      gender: user.gender,
      preferredLanguage: user.preferredLanguage,
      isMultiUser: allUsers && allUsers.size > 1,
      totalUsers: allUsers ? allUsers.size : 1
    }, 'User context for character response');

    const styleGuidePrompt = this.styleGuideService.buildPrompt({
      ageRating: character.ageRating,
      contentFilters: character.contentTags,
    });

    const systemPrompt = `You are roleplaying as the character: ${characterName}.\n\nCharacter Details:\n- Physical Characteristics: ${character.physicalCharacteristics || 'Not specified.'}\n- Personality: ${character.personality || 'Not specified.'}\n- Main Attire: Not specified.\n- History: ${character.history || 'No history provided.'}\n${allUsersContext}\n\nAdditional Instructions for this Conversation (Override):\n${respondingParticipant.configOverride || ''}\n\nStyle Guide:\n${styleGuidePrompt}\n\nRelationship Memory (Current Context):\n// TODO: Implement memory\n\nRoleplay Guidelines:\n1. Stay true to the defined personality and history for ${characterName}.\n2. Your responses should be consistent with the information provided above and the conversation context.\n3. ${allUsers && allUsers.size > 1 ? `⚠️ CRITICAL - MULTI-USER CONVERSATION ⚠️\nThis conversation has MULTIPLE DIFFERENT PEOPLE. Each message in the history shows WHO sent it.\n- DO NOT assume all messages are from the same person\n- ALWAYS check the name before each message to know WHO is speaking\n- When responding, address the person who sent the LATEST message\n- Each user has their own profile information listed in "All Users in this Conversation" above` : `Interact with ${user.displayName || 'User'} naturally, engagingly, and believably as ${characterName}.`}\n4. You have access to information about ${allUsers && allUsers.size > 1 ? 'all users' : 'the user'} above. Use this knowledge naturally in conversation when appropriate.\n5. CRITICAL INSTRUCTION: YOU MUST ONLY generate responses and actions for YOURSELF (${characterName}). NEVER write, narrate, or describe actions or dialogue for other characters or users. Focus solely on your own character's part in the interaction.\n6. LANGUAGE INSTRUCTION: The preferred language for this conversation is ${userLanguage}. You MUST respond in ${userLanguage} unless explicitly requested otherwise.\n7. FORMATTING INSTRUCTION: DO NOT prefix your response with your character name (like "${characterName}:" or "Naruto:"). The UI already displays your name and avatar. Just write the response content directly.\n`;

    const llmRequest: LLMRequest = {
      provider: 'gemini', // Or determine dynamically
      model: 'gemini-2.5-flash-lite', // Or determine dynamically
      systemPrompt: `${systemPrompt}\n\nTOOL USAGE:\nYou have access to web_search tool. Use it when you need current information, real-time data, or facts that may have changed since your training. Examples: weather, news, current events, recent facts.`,
      userPrompt: `${conversationContext}\n\n🎯 LATEST MESSAGE TO RESPOND TO:\nFrom: **${lastMessageSender}**\nMessage: "${lastMessage.content}"\n\n${allUsers && allUsers.size > 1 ? `⚠️ IMPORTANT: You are responding to ${lastMessageSender}, NOT to any other person in the conversation. Make sure to address ${lastMessageSender} directly in your response.\n\n` : ''}Respond now as ${characterName}. Remember: DO NOT include "${characterName}:" at the start of your response.`,
      allowBrowsing: true,       // Enable web search
      autoExecuteTools: true,    // Auto-execute tools
      temperature: 0.8,          // Slightly creative for roleplay
    };

    // Log the complete prompt being sent to LLM for debugging
    logger.info({
      conversationId: conversation.id,
      isMultiUser: allUsers && allUsers.size > 1,
      lastMessageSender,
      lastMessageSenderId: lastMessage.senderId,
      systemPromptPreview: llmRequest.systemPrompt?.substring(0, 500) + '...',
      userPromptPreview: llmRequest.userPrompt?.substring(0, 500) + '...',
      fullSystemPrompt: llmRequest.systemPrompt,
      fullUserPrompt: llmRequest.userPrompt
    }, 'LLM Request Details');

    try {
      const llmResponse = await callLLM(llmRequest);

      // Track LLM usage for cost analysis
      trackFromLLMResponse(llmResponse, {
        userId: user.id,
        feature: 'CHAT_MESSAGE',
        featureId: conversation.id,
        operation: 'roleplay_response',
        cached: false,
        metadata: {
          conversationId: conversation.id,
          characterId: character.id,
          participantId: respondingParticipant.id,
          isMultiUser: allUsers && allUsers.size > 1,
          messageCount: conversation.messages.length,
        },
      });

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
    historyContext: string,
    lastMessage: Message,
    user: User,
    assistantName: string,
    assistantDescription: string,
    configOverride: string
  ): Promise<string> {
    const participantsContext = formattedParticipants
      .map((p) => `- ${p.type}: ${p.name}`)
      .join('\n');

    const conversationContext = [
      'Participants:',
      participantsContext || 'No participants context available.',
      '',
      'Conversation history:',
      historyContext || 'No previous messages.',
    ].join('\n');

    const userContext = this.formatUserContext(user);

    const systemPrompt = `You are ${assistantName}, an AI assistant.\n\nYour role and focus:\n${assistantDescription}\n\nUser Information (Person you're assisting):\n${userContext}\n\n${configOverride ? `Additional instructions for this conversation:\n${configOverride}\n` : ''}\n\nGuidelines:\n1. Stay focused on your area of expertise: ${assistantDescription}\n2. Be helpful, clear, and concise\n3. You can engage in casual conversation, but prioritize your main function\n4. You have access to the user's information above. Use this knowledge naturally when appropriate.\n5. Do not roleplay as the user (${user.displayName || 'User'})\n6. FORMATTING INSTRUCTION: DO NOT prefix your response with your name (like "${assistantName}:"). The UI already displays your name and avatar. Just write the response content directly.`;

    const llmRequest: LLMRequest = {
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      systemPrompt: `${systemPrompt}\n\nTOOL USAGE:\nYou have access to web_search tool. Use it when you need current information, real-time data, or facts that may have changed since your training. Examples: weather, news, current events, recent facts, stock prices, etc.`,
      userPrompt: `${conversationContext}\n\nLatest message:\n${lastMessage.content}\n\nRespond now as ${assistantName}. Remember: DO NOT include "${assistantName}:" at the start of your response.`,
      allowBrowsing: true,       // Enable web search
      autoExecuteTools: true,    // Auto-execute tools
      temperature: 0.7,          // Balanced for assistance
    };

    try {
      const llmResponse = await callLLM(llmRequest);

      // Track LLM usage for cost analysis (assistant without character)
      trackFromLLMResponse(llmResponse, {
        userId: user.id,
        feature: 'CHAT_MESSAGE',
        featureId: lastMessage.conversationId,
        operation: 'assistant_response',
        cached: false,
        metadata: {
          conversationId: lastMessage.conversationId,
          assistantName,
          isAssistant: true,
        },
      });

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
    return str.replace(/[.*+?^${}()|[\\]/g, '\\$&');
  }
}
