import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { SenderType } from '../generated/prisma';
import * as messageService from './messageService';

/**
 * Assistant Service
 *
 * Handles AI assistant logic, prompt building, and LLM integration.
 * Based on Phase 2 (Chat System) requirements.
 *
 * NOTE: This is a placeholder implementation. LLM integration will be added in Phase 2.4.
 * For now, it returns simple mock responses.
 */

/**
 * Build system prompt for an assistant based on character and conversation context
 */
function buildSystemPrompt(
  assistantInstructions: string,
  character: {
    firstName: string;
    lastName: string | null;
    personality: string | null;
    history: string | null;
    physicalCharacteristics: string | null;
  }
): string {
  const characterName = [character.firstName, character.lastName]
    .filter(Boolean)
    .join(' ');

  let prompt = `You are ${characterName}.\n\n`;

  if (character.personality) {
    prompt += `Personality: ${character.personality}\n\n`;
  }

  if (character.history) {
    prompt += `Background: ${character.history}\n\n`;
  }

  if (character.physicalCharacteristics) {
    prompt += `Physical characteristics: ${character.physicalCharacteristics}\n\n`;
  }

  prompt += `Instructions: ${assistantInstructions}\n\n`;
  prompt += `Respond in character, maintaining consistency with your personality and background.`;

  return prompt;
}

/**
 * Build conversation history for context
 */
async function buildConversationHistory(
  conversationId: string,
  limit: number = 20
) {
  const messages = await messageService.getLastMessages(conversationId, limit);

  return messages.map((msg) => ({
    role: msg.senderType === SenderType.USER ? 'user' : 'assistant',
    content: msg.content,
  }));
}

/**
 * Generate AI response for a conversation
 * This is a placeholder - will integrate with LLM providers in Phase 2.4
 */
export async function generateResponse(
  conversationId: string,
  participantId: string
): Promise<string> {
  try {
    // Get participant details (assistant + character)
    const participant = await prisma.conversationParticipant.findUnique({
      where: { id: participantId },
      include: {
        actingAssistant: true,
        representingCharacter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            personality: true,
            history: true,
            physicalCharacteristics: true,
          },
        },
      },
    });

    if (!participant || !participant.actingAssistant || !participant.representingCharacter) {
      throw Object.assign(
        new Error('Invalid participant: must have assistant and character'),
        { statusCode: 400 }
      );
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      participant.actingAssistant.instructions,
      participant.representingCharacter
    );

    // Get conversation history
    const conversationHistory = await buildConversationHistory(conversationId);

    // TODO: Integrate with LLM provider (Gemini, OpenAI, XAI Grok)
    // For now, return a placeholder response
    logger.info(
      { conversationId, participantId, systemPrompt, conversationHistory },
      'Generating AI response (placeholder)'
    );

    const characterName = [
      participant.representingCharacter.firstName,
      participant.representingCharacter.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    return `[AI Response from ${characterName}] This is a placeholder response. LLM integration will be implemented in Phase 2.4 (WebSocket). The system prompt and conversation history have been prepared.`;
  } catch (error) {
    logger.error(
      { error, conversationId, participantId },
      'Error generating AI response'
    );
    throw error;
  }
}

/**
 * Send AI-generated message to conversation
 */
export async function sendAIMessage(
  conversationId: string,
  participantId: string
): Promise<any> {
  try {
    // Generate response
    const content = await generateResponse(conversationId, participantId);

    // Get participant details for sender info
    const participant = await prisma.conversationParticipant.findUnique({
      where: { id: participantId },
      select: {
        actingAssistantId: true,
      },
    });

    if (!participant || !participant.actingAssistantId) {
      throw Object.assign(
        new Error('Participant must have an assistant'),
        { statusCode: 400 }
      );
    }

    // Create message
    const message = await messageService.createMessage({
      conversationId,
      senderId: participant.actingAssistantId,
      senderType: SenderType.ASSISTANT,
      content,
    });

    logger.info(
      { conversationId, messageId: message.id },
      'AI message sent successfully'
    );

    return message;
  } catch (error) {
    logger.error(
      { error, conversationId, participantId },
      'Error sending AI message'
    );
    throw error;
  }
}
