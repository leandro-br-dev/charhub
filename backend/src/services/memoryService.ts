// backend/src/services/memoryService.ts
import { prisma } from '../config/database';
import { logger } from '../config/logger';

// Constants
const CONTEXT_LIMIT = 50; // Limite de mensagens antes de compactar
const MESSAGES_TO_COMPRESS = 30; // Quantas mensagens compactar quando limite é atingido
const RECENT_MESSAGES_TO_KEEP = 20; // Quantas mensagens recentes manter sem resumir

interface KeyEvent {
  timestamp: string;
  description: string;
  participants: string[];
  importance: 'high' | 'medium' | 'low';
}

interface GeneratedMemory {
  summary: string;
  keyEvents: KeyEvent[];
  messageCount: number;
}

class MemoryService {
  /**
   * Verifica se a conversa atingiu o limite de contexto e precisa de compactação
   */
  async shouldCompressMemory(conversationId: string): Promise<boolean> {
    try {
      // Contar total de mensagens na conversa
      const totalMessages = await prisma.message.count({
        where: { conversationId }
      });

      // Buscar última memória criada
      const lastMemory = await prisma.conversationMemory.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' }
      });

      // Se não tem memória, verifica se ultrapassou o limite
      if (!lastMemory) {
        return totalMessages >= CONTEXT_LIMIT;
      }

      // Contar mensagens criadas após a última compactação
      const messagesAfterMemory = await prisma.message.count({
        where: {
          conversationId,
          timestamp: { gt: lastMemory.createdAt }
        }
      });

      // Precisa compactar se tem mais de CONTEXT_LIMIT mensagens novas
      return messagesAfterMemory >= CONTEXT_LIMIT;
    } catch (error) {
      logger.error({ error, conversationId }, 'Error checking if should compress memory');
      return false;
    }
  }

  /**
   * Gera resumo compactado das mensagens
   */
  async generateMemory(conversationId: string): Promise<GeneratedMemory | null> {
    try {
      // Buscar última memória para saber onde parar
      const lastMemory = await prisma.conversationMemory.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' }
      });

      // Buscar mensagens a serem resumidas (primeiras N mensagens não resumidas)
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          ...(lastMemory ? { timestamp: { gt: lastMemory.createdAt } } : {})
        },
        orderBy: { timestamp: 'asc' },
        take: MESSAGES_TO_COMPRESS
      });

      if (messages.length === 0) {
        logger.warn({ conversationId }, 'No messages to compress');
        return null;
      }

      // Buscar participantes e usuários para nomes
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true, displayName: true } },
              actingCharacter: {
                select: { id: true, firstName: true }
              },
              representingCharacter: {
                select: { id: true, firstName: true }
              },
              actingAssistant: { select: { id: true, name: true } }
            }
          }
        }
      });

      // Map para lookup rápido de nomes
      const participantNames = new Map<string, string>();
      conversation?.participants.forEach(p => {
        if (p.user) {
          participantNames.set(p.user.id, (p.user.displayName || p.user.username) ?? 'User');
        }
        if (p.representingCharacter) {
          participantNames.set(p.id, p.representingCharacter.firstName);
        } else if (p.actingCharacter) {
          participantNames.set(p.id, p.actingCharacter.firstName);
        } else if (p.actingAssistant) {
          participantNames.set(p.id, p.actingAssistant.name);
        }
      });

      // Construir contexto para o LLM
      const conversationText = messages.map(msg => {
        const senderName = participantNames.get(msg.senderId) ||
                          (msg.senderType === 'USER' ? 'User' : 'Character');
        return `[${msg.timestamp.toISOString()}] ${senderName}: ${msg.content}`;
      }).join('\n');

      // Importação dinâmica para evitar circular dependency
      const { callLLM } = await import('./llm');

      const systemPrompt = `You are a narrative memory assistant. Generate a structured summary of a roleplay conversation.

Output a JSON object with:
- summary: concise prose summary (3-5 sentences) of what happened
- keyEvents: array of important events with:
  - timestamp: ISO datetime
  - description: what happened (1-2 sentences)
  - participants: array of participant names involved
  - importance: "high", "medium", or "low"

Focus on story-critical information. Discard filler/small talk. Be concise.`;

      const userPrompt = `Conversation to summarize:\n\n${conversationText}\n\nGenerate structured memory (respond with valid JSON only):`;

      // Gerar resumo via LLM
      const result = await callLLM({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 2000,
      });

      // Parse JSON response
      let parsed: GeneratedMemory;
      try {
        // Remove markdown code blocks if present
        const cleaned = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        logger.error({ error: parseError, content: result.content }, 'Failed to parse LLM JSON response');
        throw new Error('Failed to parse memory JSON');
      }

      return {
        summary: parsed.summary,
        keyEvents: parsed.keyEvents || [],
        messageCount: messages.length
      };
    } catch (error) {
      logger.error({ error, conversationId }, 'Error generating memory');
      throw error;
    }
  }

  /**
   * Salva memória compactada no banco
   */
  async saveMemory(
    conversationId: string,
    memory: GeneratedMemory,
    startMessageId: string,
    endMessageId: string
  ) {
    try {
      const savedMemory = await prisma.conversationMemory.create({
        data: {
          conversationId,
          summary: memory.summary,
          keyEvents: memory.keyEvents as any,
          messageCount: memory.messageCount,
          startMessageId,
          endMessageId
        }
      });

      // Atualizar timestamp na conversa
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { memoryLastUpdatedAt: new Date() }
      });

      logger.info({ conversationId, memoryId: savedMemory.id, messageCount: memory.messageCount }, 'Memory saved successfully');

      return savedMemory;
    } catch (error) {
      logger.error({ error, conversationId }, 'Error saving memory');
      throw error;
    }
  }

  /**
   * Busca todas as memórias de uma conversa (ordenadas)
   */
  async getConversationMemories(conversationId: string) {
    return prisma.conversationMemory.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Busca última memória de uma conversa
   */
  async getLatestMemory(conversationId: string) {
    return prisma.conversationMemory.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Constrói contexto completo: resumos + mensagens recentes
   * Este método é usado pelo sistema de geração de respostas
   */
  async buildContextWithMemory(
    conversationId: string,
    recentMessageLimit: number = RECENT_MESSAGES_TO_KEEP
  ): Promise<string> {
    try {
      // Buscar todas as memórias (resumos compactados)
      const memories = await this.getConversationMemories(conversationId);

      // Buscar mensagens recentes (não resumidas)
      const recentMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'desc' },
        take: recentMessageLimit
      });

      // Buscar participantes para nomes
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true, displayName: true } },
              actingCharacter: {
                select: { id: true, firstName: true }
              },
              representingCharacter: {
                select: { id: true, firstName: true }
              },
              actingAssistant: { select: { id: true, name: true } }
            }
          }
        }
      });

      // Map para lookup rápido de nomes
      const participantNames = new Map<string, string>();
      conversation?.participants.forEach(p => {
        if (p.user) {
          participantNames.set(p.user.id, (p.user.displayName || p.user.username) ?? 'User');
        }
        if (p.representingCharacter) {
          participantNames.set(p.id, p.representingCharacter.firstName);
        } else if (p.actingCharacter) {
          participantNames.set(p.id, p.actingCharacter.firstName);
        } else if (p.actingAssistant) {
          participantNames.set(p.id, p.actingAssistant.name);
        }
      });

      // Reverter ordem (mais antiga primeiro)
      recentMessages.reverse();

      let context = '';

      // Adicionar resumos compactados
      if (memories.length > 0) {
        context += '[= CONVERSATION HISTORY (SUMMARIZED) =]\n\n';

        memories.forEach((memory: any, index: number) => {
          context += `=== Summary ${index + 1} (${memory.messageCount} messages) ===\n`;
          context += `${memory.summary}\n\n`;

          if (memory.keyEvents && Array.isArray(memory.keyEvents) && memory.keyEvents.length > 0) {
            context += 'Key Events:\n';
            (memory.keyEvents as KeyEvent[]).forEach((event: KeyEvent) => {
              context += `- ${event.description} (${event.importance})\n`;
            });
            context += '\n';
          }
        });

        context += '[= END OF SUMMARIZED HISTORY =]\n\n';
      }

      // Adicionar mensagens recentes
      if (recentMessages.length > 0) {
        context += '[= RECENT MESSAGES (FULL CONTEXT) =]\n\n';

        recentMessages.forEach(msg => {
          const senderName = participantNames.get(msg.senderId) ||
                            (msg.senderType === 'USER' ? 'User' : 'Character');
          context += `${senderName}: ${msg.content}\n`;
        });
      }

      return context;
    } catch (error) {
      logger.error({ error, conversationId }, 'Error building context with memory');

      // Fallback: retornar apenas mensagens recentes
      const fallbackMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'desc' },
        take: recentMessageLimit
      });

      fallbackMessages.reverse();

      return fallbackMessages.map(msg => {
        return `${msg.senderType === 'USER' ? 'User' : 'Character'}: ${msg.content}`;
      }).join('\n');
    }
  }

  /**
   * Executa compactação completa: gera memória e salva
   */
  async compressConversationMemory(conversationId: string): Promise<boolean> {
    try {
      logger.info({ conversationId }, 'Starting memory compression');

      // Gerar memória
      const memory = await this.generateMemory(conversationId);

      if (!memory) {
        logger.warn({ conversationId }, 'No memory generated');
        return false;
      }

      // Buscar IDs das mensagens resumidas
      const lastMemory = await this.getLatestMemory(conversationId);

      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          ...(lastMemory ? { timestamp: { gt: lastMemory.createdAt } } : {})
        },
        orderBy: { timestamp: 'asc' },
        take: MESSAGES_TO_COMPRESS,
        select: { id: true }
      });

      if (messages.length === 0) {
        logger.warn({ conversationId }, 'No messages found for compression');
        return false;
      }

      const startMessageId = messages[0].id;
      const endMessageId = messages[messages.length - 1].id;

      // Salvar memória
      await this.saveMemory(conversationId, memory, startMessageId, endMessageId);

      logger.info({
        conversationId,
        messagesCompressed: messages.length,
        summaryLength: memory.summary.length,
        keyEventsCount: memory.keyEvents.length
      }, 'Memory compression completed successfully');

      return true;
    } catch (error) {
      logger.error({ error, conversationId }, 'Error compressing conversation memory');
      return false;
    }
  }
}

export const memoryService = new MemoryService();
export { CONTEXT_LIMIT, MESSAGES_TO_COMPRESS, RECENT_MESSAGES_TO_KEEP };
