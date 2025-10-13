
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { SenderType } from '../generated/prisma';
import * as messageService from './messageService';
import { agentService } from './agentService';

export async function sendAIMessage(
  conversationId: string,
  participantId: string
): Promise<any> {
  try {
    const agent = agentService.getResponseGenerationAgent();

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: true,
            actingCharacter: true,
            actingAssistant: {
              include: {
                defaultCharacter: true,
              },
            },
            representingCharacter: true,
          },
        },
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
        },
        owner: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];

    const content = await agent.execute(
      conversation,
      conversation.owner,
      lastMessage
    );

    const participant = await prisma.conversationParticipant.findUnique({
      where: { id: participantId },
      select: {
        actingAssistantId: true,
      },
    });

    if (!participant || !participant.actingAssistantId) {
      throw Object.assign(new Error('Participant must have an assistant'), {
        statusCode: 400,
      });
    }

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
