import { logger } from '../config/logger';
import { callLLM, LLMRequest } from '../services/llm';
import { modelRouter } from '../services/llm/modelRouter';
import { trackFromLLMResponse } from '../services/llm/llmUsageTracker';
import { contentClassificationService } from '../services/contentClassification';
import {
  formatParticipantsForLLM,
} from '../utils/conversationFormatter';
import { Conversation, Message, User } from '../generated/prisma';
import { StyleGuideService } from './style-guides';
import { calculateAge, getLanguageName } from '../utils/agentUtils';
import { decryptMessage, isEncrypted } from '../services/encryption';
import {
  formatUserContext as formatUserContextFormatter,
  parseUserConfig,
  formatBasicUserContext,
} from './context/formatters/userContextFormatter';

export class ResponseGenerationAgent {
  private styleGuideService = new StyleGuideService();

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

    // Find user's participant entry and load persona if set
    const userParticipant = conversation.participants.find(
      p => p.userId === user.id
    );

    let personaCharacter = null;
    if (userParticipant?.representingCharacterId) {
      // Load persona character data
      const { prisma } = await import('../config/database');
      personaCharacter = await prisma.character.findUnique({
        where: { id: userParticipant.representingCharacterId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          physicalCharacteristics: true,
          personality: true,
        }
      });

      if (personaCharacter) {
        logger.debug({
          userId: user.id,
          personaCharacterId: personaCharacter.id,
          personaName: `${personaCharacter.firstName} ${personaCharacter.lastName || ''}`.trim(),
        }, 'User has assumed a persona character');
      }
    }

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

    // DEBUG: Log configOverride from respondingParticipant
    logger.debug(
      {
        conversationId: conversation.id,
        participantId: respondingParticipant.id,
        characterId: respondingParticipant.actingCharacterId,
        assistantId: respondingParticipant.actingAssistantId,
        hasConfigOverride: !!respondingParticipant.configOverride,
        configOverride: respondingParticipant.configOverride?.substring(0, 100) || null,
        configOverrideLength: respondingParticipant.configOverride?.length || 0,
      },
      'DEBUG: Selected participant for response - ConfigOverride check'
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
      historyContext && historyContext.trim().length > 0 ? historyContext : 'No previous messages.',
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

      // First, load all personas in parallel (better performance than sequential in forEach)
      const personaPromises: Array<Promise<{ userId: string; persona: any }>> = [];
      for (const [userId] of allUsers) {
        const thisUserParticipant = conversation.participants.find(p => p.userId === userId);
        if (thisUserParticipant?.representingCharacterId) {
          const promise = (async () => {
            const { prisma } = await import('../config/database');
            const persona = await prisma.character.findUnique({
              where: { id: thisUserParticipant.representingCharacterId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                physicalCharacteristics: true,
                personality: true,
              }
            });
            return { userId, persona };
          })();
          personaPromises.push(promise);
        }
      }

      // Wait for all personas to load
      const loadedPersonas = await Promise.all(personaPromises);
      const personaMap = new Map(loadedPersonas.map(p => [p.userId, p.persona]));

      // Now format each user context
      allUsers.forEach((u, userId) => {
        const thisUserParticipant = conversation.participants.find(p => p.userId === userId);
        const thisUserPersona = personaMap.get(userId) || null;

        // Use persona-aware context for each user
        const userContextResult = formatUserContextFormatter({
          user: u,
          userParticipant: thisUserParticipant,
          personaCharacter: thisUserPersona,
        });
        userContexts.push(`\n**${u.displayName || 'User'}** (ID: ${userId.slice(0, 8)}):\n${userContextResult.context}`);

        // Check if this user sent the last message
        if (lastMessage.senderId === userId) {
          lastMessageSender = userContextResult.displayName;
        }
      });
      allUsersContext = '\n\nAll Users in this Conversation:' + userContexts.join('\n');
    } else {
      // Solo conversation: use single user context with persona support
      const userContextResult = formatUserContextFormatter({
        user,
        userParticipant,
        personaCharacter,
      });
      allUsersContext = '\n\nUser Information (Person you\'re talking to):\n' + userContextResult.context;

      // Update lastMessageSender to use persona name if user has one
      lastMessageSender = userContextResult.displayName;
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

    // Extract gender from configOverride to create explicit gender reminder
    // Use the same gender logic as the formatter
    const userContextResult = formatUserContextFormatter({
      user,
      userParticipant,
      personaCharacter,
    });
    const userGenderForContext = userContextResult.gender;

    // DEBUG: Log gender reminder decision
    const userConfig = parseUserConfig(userParticipant?.configOverride);
    logger.debug({
      userId: user.id,
      userGender: user.gender,
      genderOverride: userConfig?.genderOverride,
      personaGender: personaCharacter?.gender,
      finalGenderForContext: userGenderForContext,
    }, 'DEBUG: Gender reminder decision');

    // Build override section with visual emphasis
    const overrideSection = respondingParticipant.configOverride
      ? `\n⚠️ CRITICAL OVERRIDE INSTRUCTIONS FOR THIS CONVERSATION ⚠️\nThe following instructions take PRECEDENCE over the base character personality.\nApply these modifications to your behavior for THIS CONVERSATION ONLY:\n\n${respondingParticipant.configOverride}\n\n`
      : '';

    // CRITICAL: Add explicit gender reminder to prevent LLM from making assumptions
    const genderReminder = `\n🚨 CRITICAL GENDER INFORMATION 🚨\nThe user's gender is: ${userGenderForContext.toUpperCase()}\n- NEVER assume gender based on the user's name - use the configured gender: ${userGenderForContext.toUpperCase()}\n- This is NOT optional - you MUST respect this gender configuration\n\n`;

    // DEBUG: Log override section details
    logger.debug(
      {
        conversationId: conversation.id,
        participantId: respondingParticipant.id,
        hasOverrideSection: overrideSection.length > 0,
        overrideSectionLength: overrideSection.length,
        overrideSectionPreview: overrideSection ? overrideSection.substring(0, 200) : null,
      },
      'DEBUG: Override section built'
    );

    const systemPrompt = `You are roleplaying as the character: ${characterName}.\n\nCharacter Details:\n- Physical Characteristics: ${character.physicalCharacteristics || 'Not specified.'}\n- Personality: ${character.personality || 'Not specified.'}\n- Main Attire: Not specified.\n- History: ${character.history || 'No history provided.'}\n${allUsersContext}\n${genderReminder}${overrideSection}Style Guide:\n${styleGuidePrompt}\n\nRelationship Memory (Current Context):\n// TODO: Implement memory\n\nRoleplay Guidelines:\n1. Stay true to the defined personality and history for ${characterName}.\n2. Your responses should be consistent with the information provided above and the conversation context.\n3. ${allUsers && allUsers.size > 1 ? `⚠️ CRITICAL - MULTI-USER CONVERSATION ⚠️\nThis conversation has MULTIPLE DIFFERENT PEOPLE. Each message in the history shows WHO sent it.\n- DO NOT assume all messages are from the same person\n- ALWAYS check the name before each message to know WHO is speaking\n- When responding, address the person who sent the LATEST message\n- Each user has their own profile information listed in "All Users in this Conversation" above` : `Interact with ${user.displayName || 'User'} naturally, engagingly, and believably as ${characterName}.`}\n4. You have access to information about ${allUsers && allUsers.size > 1 ? 'all users' : 'the user'} above. Use this knowledge naturally in conversation when appropriate.\n5. CRITICAL INSTRUCTION: YOU MUST ONLY generate responses and actions for YOURSELF (${characterName}). NEVER write, narrate, or describe actions or dialogue for other characters or users. Focus solely on your own character's part in the interaction.\n6. LANGUAGE INSTRUCTION: The preferred language for this conversation is ${userLanguage}. You MUST respond in ${userLanguage} unless explicitly requested otherwise.\n7. FORMATTING INSTRUCTION: DO NOT prefix your response with your character name (like "${characterName}:" or "Naruto:"). The UI already displays your name and avatar. Just write the response content directly.\n8. GENDER INSTRUCTION: ALWAYS respect the user's configured gender shown above in "CRITICAL GENDER INFORMATION". Never assume gender based on name.\n${overrideSection ? '9. OVERRIDE INSTRUCTION: If the override instructions above conflict with the base personality, PRIORITIZE the override instructions.\n' : ''}`;

    // CONTENT FILTERING: Decrypt last message first if encrypted (messages are stored encrypted in database)
    // We need to decrypt BEFORE building the prompt so the LLM sees the actual message content
    const decryptedLastMessageContent = isEncrypted(lastMessage.content)
      ? decryptMessage(lastMessage.content)
      : lastMessage.content;

    const userPromptText = `${conversationContext}\n\n🎯 LATEST MESSAGE TO RESPOND TO:\nFrom: **${lastMessageSender}**\nMessage: "${decryptedLastMessageContent}"\n\n${allUsers && allUsers.size > 1 ? `⚠️ IMPORTANT: You are responding to ${lastMessageSender}, NOT to any other person in the conversation. Make sure to address ${lastMessageSender} directly in your response.\n\n` : ''}Respond now as ${characterName}. Remember: DO NOT include "${characterName}:" at the start of your response.`;

    // This uses Gemini 2.5 Flash-Lite to determine if content is appropriate for user's age
    const classification = await contentClassificationService.classifyText(
      decryptedLastMessageContent,
      {
        characterTags: character.contentTags || undefined,
        existingAgeRating: character.ageRating || undefined,
      }
    );

    logger.info({
      conversationId: conversation.id,
      userId: user.id,
      messageContent: decryptedLastMessageContent.substring(0, 100),
      classification,
    }, 'content_classification_check');

    // Validate user can access this content
    contentClassificationService.validateUserAccess(
      classification.ageRating,
      user.birthDate ? calculateAge(new Date(user.birthDate)) : undefined,
      user.birthDate || undefined
    );

    // Get model for chat (now simplified - Venice AI for all chat)
    const modelSelection = await modelRouter.getModel({ feature: 'CHAT' });

    logger.info({
      conversationId: conversation.id,
      characterId: character.id,
      provider: modelSelection.provider,
      model: modelSelection.model,
      reasoning: modelSelection.reasoning,
    }, 'Model selected for chat response');

    const llmRequest: LLMRequest = {
      provider: modelSelection.provider,
      model: modelSelection.model,
      systemPrompt: `${systemPrompt}\n\nTOOL USAGE:\nYou have access to web_search tool. Use it when you need current information, real-time data, or facts that may have changed since your training. Examples: weather, news, current events, recent facts.`,
      userPrompt: userPromptText,
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
      fullUserPrompt: llmRequest.userPrompt,
      // DEBUG: Include override section info
      overrideIncluded: !!overrideSection,
      overrideLength: overrideSection.length,
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
          usedFallback: false,
        },
      });

      // Post-process: Remove character name prefix if LLM still added it
      return this.removeNamePrefix(llmResponse.content, characterName);
    } catch (error: any) {
      // Check if this is a rate limit error (429) or similar
      const isRateLimitError =
        error?.status === 429 ||
        error?.statusCode === 429 ||
        (error?.message && (
          error.message.toLowerCase().includes('rate limit') ||
          error.message.toLowerCase().includes('rate-limited') ||
          error.message.toLowerCase().includes('temporarily')
        ));

      if (isRateLimitError) {
        logger.warn({
          conversationId: conversation.id,
          originalProvider: modelSelection.provider,
          originalModel: modelSelection.model,
          error: error?.message || 'Unknown rate limit error',
        }, 'Primary model rate limited, falling back to Grok');

        const fallbackModelSelection = modelRouter.getChatFallbackModel();

        logger.info({
          conversationId: conversation.id,
          fallbackProvider: fallbackModelSelection.provider,
          fallbackModel: fallbackModelSelection.model,
          reasoning: fallbackModelSelection.reasoning,
        }, 'Retrying with fallback model');

        // Create new request with fallback model
        const fallbackLlmRequest: LLMRequest = {
          ...llmRequest,
          provider: fallbackModelSelection.provider,
          model: fallbackModelSelection.model,
        };

        try {
          const fallbackLlmResponse = await callLLM(fallbackLlmRequest);

          logger.info({
            conversationId: conversation.id,
            fallbackProvider: fallbackModelSelection.provider,
            fallbackModel: fallbackModelSelection.model,
          }, 'Fallback model succeeded');

          // Track LLM usage for cost analysis (with fallback)
          trackFromLLMResponse(fallbackLlmResponse, {
            userId: user.id,
            feature: 'CHAT_MESSAGE',
            featureId: conversation.id,
            operation: 'roleplay_response_fallback',
            cached: false,
            metadata: {
              conversationId: conversation.id,
              characterId: character.id,
              participantId: respondingParticipant.id,
              isMultiUser: allUsers && allUsers.size > 1,
              messageCount: conversation.messages.length,
              usedFallback: true,
            },
          });

          // Post-process: Remove character name prefix if LLM still added it
          return this.removeNamePrefix(fallbackLlmResponse.content, characterName);
        } catch (fallbackError) {
          logger.error({
            conversationId: conversation.id,
            fallbackProvider: fallbackModelSelection.provider,
            fallbackModel: fallbackModelSelection.model,
            error: fallbackError,
          }, 'Fallback model also failed, throwing original error');
          throw error; // Throw original error, not fallback error
        }
      }

      // If not a rate limit error, or fallback failed, throw the original error
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
      historyContext && historyContext.trim().length > 0 ? historyContext : 'No previous messages.',
    ].join('\n');

    const userContext = formatBasicUserContext(user);

    const systemPrompt = `You are ${assistantName}, an AI assistant.\n\nYour role and focus:\n${assistantDescription}\n\nUser Information (Person you're assisting):\n${userContext}\n\n${configOverride ? `Additional instructions for this conversation:\n${configOverride}\n` : ''}\n\nGuidelines:\n1. Stay focused on your area of expertise: ${assistantDescription}\n2. Be helpful, clear, and concise\n3. You can engage in casual conversation, but prioritize your main function\n4. You have access to the user's information above. Use this knowledge naturally when appropriate.\n5. Do not roleplay as the user (${user.displayName || 'User'})\n6. FORMATTING INSTRUCTION: DO NOT prefix your response with your name (like "${assistantName}:"). The UI already displays your name and avatar. Just write the response content directly.`;

    // CONTENT FILTERING: Decrypt last message first if encrypted (messages are stored encrypted in database)
    // We need to decrypt BEFORE building the prompt so the LLM sees the actual message content
    const decryptedLastMessageContent = isEncrypted(lastMessage.content)
      ? decryptMessage(lastMessage.content)
      : lastMessage.content;

    const userPromptText = `${conversationContext}\n\nLatest message:\n${decryptedLastMessageContent}\n\nRespond now as ${assistantName}. Remember: DO NOT include "${assistantName}:" at the start of your response.`;

    const classification = await contentClassificationService.classifyText(decryptedLastMessageContent);

    logger.info({
      conversationId: lastMessage.conversationId,
      userId: user.id,
      messageContent: decryptedLastMessageContent.substring(0, 100),
      classification,
    }, 'content_classification_check_assistant');

    // Validate user can access this content
    contentClassificationService.validateUserAccess(
      classification.ageRating,
      user.birthDate ? calculateAge(new Date(user.birthDate)) : undefined,
      user.birthDate || undefined
    );

    // Get model for chat (Venice AI for all chat)
    const modelSelection = await modelRouter.getModel({ feature: 'CHAT' });

    logger.info({
      conversationId: lastMessage.conversationId,
      assistantName,
      provider: modelSelection.provider,
      model: modelSelection.model,
      reasoning: modelSelection.reasoning,
    }, 'Model selected for assistant chat response');

    const llmRequest: LLMRequest = {
      provider: modelSelection.provider,
      model: modelSelection.model,
      systemPrompt: `${systemPrompt}\n\nTOOL USAGE:\nYou have access to web_search tool. Use it when you need current information, real-time data, or facts that may have changed since your training. Examples: weather, news, current events, recent facts, stock prices, etc.`,
      userPrompt: userPromptText,
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
    } catch (error: any) {
      // Check if this is a rate limit error (429) or similar
      const isRateLimitError =
        error?.status === 429 ||
        error?.statusCode === 429 ||
        (error?.message && (
          error.message.toLowerCase().includes('rate limit') ||
          error.message.toLowerCase().includes('rate-limited') ||
          error.message.toLowerCase().includes('temporarily')
        ));

      if (isRateLimitError) {
        logger.warn({
          conversationId: lastMessage.conversationId,
          originalProvider: modelSelection.provider,
          originalModel: modelSelection.model,
          error: error?.message || 'Unknown rate limit error',
        }, 'Primary model rate limited for assistant, falling back to Grok');

        const fallbackModelSelection = modelRouter.getChatFallbackModel();

        logger.info({
          conversationId: lastMessage.conversationId,
          fallbackProvider: fallbackModelSelection.provider,
          fallbackModel: fallbackModelSelection.model,
          reasoning: fallbackModelSelection.reasoning,
        }, 'Retrying with fallback model for assistant');

        // Create new request with fallback model
        const fallbackLlmRequest: LLMRequest = {
          ...llmRequest,
          provider: fallbackModelSelection.provider,
          model: fallbackModelSelection.model,
        };

        try {
          const fallbackLlmResponse = await callLLM(fallbackLlmRequest);

          logger.info({
            conversationId: lastMessage.conversationId,
            fallbackProvider: fallbackModelSelection.provider,
            fallbackModel: fallbackModelSelection.model,
          }, 'Fallback model succeeded for assistant');

          // Track LLM usage for cost analysis (assistant with fallback)
          trackFromLLMResponse(fallbackLlmResponse, {
            userId: user.id,
            feature: 'CHAT_MESSAGE',
            featureId: lastMessage.conversationId,
            operation: 'assistant_response_fallback',
            cached: false,
            metadata: {
              conversationId: lastMessage.conversationId,
              assistantName,
              isAssistant: true,
              usedFallback: true,
            },
          });

          // Post-process: Remove assistant name prefix if LLM still added it
          return this.removeNamePrefix(fallbackLlmResponse.content, assistantName);
        } catch (fallbackError) {
          logger.error({
            conversationId: lastMessage.conversationId,
            fallbackProvider: fallbackModelSelection.provider,
            fallbackModel: fallbackModelSelection.model,
            error: fallbackError,
          }, 'Fallback model also failed for assistant, throwing original error');
          throw error; // Throw original error, not fallback error
        }
      }

      // If not a rate limit error, or fallback failed, throw the original error
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
