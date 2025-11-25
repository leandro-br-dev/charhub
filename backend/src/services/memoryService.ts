// backend/src/services/memoryService.ts
import { prisma } from '../config/database';
import { logger } from '../config/logger';

// Constants - Token-based limits
const MAX_CONTEXT_TOKENS = parseInt(process.env.MAX_CONTEXT_TOKENS || '8000', 10); // Total context window
const MAX_COMPRESSED_TOKENS = Math.floor(MAX_CONTEXT_TOKENS * 0.30); // 30% for compressed history
const RECENT_MESSAGES_COUNT = 10; // Keep last 10 messages uncompressed

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
   * Estima tokens em uma string (aproximação simples)
   */
  private estimateTokens(text: string): number {
    // Estimativa: 1 token ≈ 4 caracteres (para inglês/português)
    return Math.ceil(text.length / 4);
  }

  /**
   * Calcula tokens totais das mensagens e do histórico compactado
   */
  async calculateContextTokens(conversationId: string): Promise<{
    compressedTokens: number;
    recentMessagesTokens: number;
    totalTokens: number;
    recentMessageCount: number;
  }> {
    // Buscar última memória (histórico compactado)
    const lastMemory = await this.getLatestMemory(conversationId);

    let compressedTokens = 0;
    if (lastMemory) {
      // Soma de todos os resumos
      const allMemories = await this.getConversationMemories(conversationId);
      compressedTokens = allMemories.reduce((sum, mem) => {
        return sum + this.estimateTokens(mem.summary);
      }, 0);
    }

    // Buscar mensagens recentes (não compactadas)
    const recentMessages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(lastMemory ? { timestamp: { gt: lastMemory.createdAt } } : {})
      },
      orderBy: { timestamp: 'desc' },
      select: { content: true }
    });

    const recentMessagesTokens = recentMessages.reduce((sum, msg) => {
      return sum + this.estimateTokens(msg.content);
    }, 0);

    return {
      compressedTokens,
      recentMessagesTokens,
      totalTokens: compressedTokens + recentMessagesTokens,
      recentMessageCount: recentMessages.length
    };
  }

  /**
   * Verifica se a conversa atingiu o limite de contexto e precisa de compactação
   */
  async shouldCompressMemory(conversationId: string): Promise<boolean> {
    try {
      const tokenStats = await this.calculateContextTokens(conversationId);

      logger.debug({
        conversationId,
        ...tokenStats,
        maxTokens: MAX_CONTEXT_TOKENS
      }, 'Context token stats');

      // Precisa compactar se:
      // 1. Total de tokens ultrapassou o limite E
      // 2. Tem mais de RECENT_MESSAGES_COUNT mensagens (para evitar compactar conversas muito pequenas)
      return tokenStats.totalTokens >= MAX_CONTEXT_TOKENS &&
             tokenStats.recentMessageCount > RECENT_MESSAGES_COUNT;
    } catch (error) {
      logger.error({ error, conversationId }, 'Error checking if should compress memory');
      return false;
    }
  }

  /**
   * Gera resumo compactado das mensagens
   * Compacta TODAS as mensagens não compactadas, exceto as últimas RECENT_MESSAGES_COUNT
   */
  async generateMemory(conversationId: string): Promise<GeneratedMemory | null> {
    try {
      // Buscar última memória para saber onde parar
      const lastMemory = await prisma.conversationMemory.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' }
      });

      // Buscar TODAS as mensagens não compactadas
      const allUncompressedMessages = await prisma.message.findMany({
        where: {
          conversationId,
          ...(lastMemory ? { timestamp: { gt: lastMemory.createdAt } } : {})
        },
        orderBy: { timestamp: 'asc' }
      });

      // Se tiver menos mensagens que o mínimo para manter, não compacta
      if (allUncompressedMessages.length <= RECENT_MESSAGES_COUNT) {
        logger.warn({ conversationId, messageCount: allUncompressedMessages.length }, 'Not enough messages to compress');
        return null;
      }

      // Compacta todas as mensagens EXCETO as últimas RECENT_MESSAGES_COUNT
      const messagesToCompress = allUncompressedMessages.slice(0, -RECENT_MESSAGES_COUNT);

      if (messagesToCompress.length === 0) {
        logger.warn({ conversationId }, 'No messages to compress after excluding recent ones');
        return null;
      }

      const messages = messagesToCompress;

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

      // Incluir resumo anterior se existir (para contexto)
      let previousContext = '';
      if (lastMemory) {
        const allMemories = await this.getConversationMemories(conversationId);
        previousContext = '\n\n[Previous Summary]:\n' + allMemories.map(m => m.summary).join('\n\n');
      }

      const systemPrompt = `You are a narrative memory assistant. Generate a VERY concise structured summary of a roleplay conversation.

IMPORTANT: The summary must be compressed to use at most ${MAX_COMPRESSED_TOKENS} tokens (approximately ${MAX_COMPRESSED_TOKENS * 4} characters).

Output a JSON object with:
- summary: extremely concise prose summary (2-3 sentences MAX) of what happened
- keyEvents: array of ONLY the most important events (max 5) with:
  - timestamp: ISO datetime
  - description: what happened (1 sentence)
  - participants: array of participant names involved
  - importance: "high", "medium", or "low"

Focus ONLY on story-critical information. Discard everything else. Be EXTREMELY concise.`;

      const userPrompt = `${previousContext}\n\nNew conversation to summarize:\n\n${conversationText}\n\nGenerate extremely concise structured memory (respond with valid JSON only):`;

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
   * Retorna: Histórico compactado (30% dos tokens) + Últimas 10 mensagens
   */
  async buildContextWithMemory(
    conversationId: string,
    recentMessageLimit: number = RECENT_MESSAGES_COUNT
  ): Promise<string> {
    try {
      // Buscar todas as memórias (resumos compactados)
      const memories = await this.getConversationMemories(conversationId);

      // Buscar última memória para saber onde param as mensagens compactadas
      const lastMemory = await this.getLatestMemory(conversationId);

      // Buscar mensagens recentes (não compactadas)
      // Se existe memória, busca apenas mensagens após a última compactação
      // Caso contrário, busca as últimas N mensagens
      const recentMessages = await prisma.message.findMany({
        where: {
          conversationId,
          ...(lastMemory ? { timestamp: { gt: lastMemory.createdAt } } : {})
        },
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

        const { decryptMessage } = await import('./encryption');

        recentMessages.forEach(msg => {
          const senderName = participantNames.get(msg.senderId) ||
                            (msg.senderType === 'USER' ? 'User' : 'Character');

          // Decrypt message content before adding to context
          let decryptedContent = msg.content;
          try {
            decryptedContent = decryptMessage(msg.content);
          } catch (error) {
            logger.error({ error, messageId: msg.id }, 'Failed to decrypt message in memory context');
            decryptedContent = '[Decryption failed]';
          }

          context += `${senderName}: ${decryptedContent}\n`;
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

      const { decryptMessage } = await import('./encryption');

      return fallbackMessages.map(msg => {
        let decryptedContent = msg.content;
        try {
          decryptedContent = decryptMessage(msg.content);
        } catch (error) {
          logger.error({ error, messageId: msg.id }, 'Failed to decrypt message in fallback');
          decryptedContent = '[Decryption failed]';
        }
        return `${msg.senderType === 'USER' ? 'User' : 'Character'}: ${decryptedContent}`;
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

      // Buscar IDs das mensagens resumidas (todas as que foram compactadas, exceto últimas RECENT_MESSAGES_COUNT)
      const lastMemory = await this.getLatestMemory(conversationId);

      // Buscar todas as mensagens não compactadas
      const allUncompressedMessages = await prisma.message.findMany({
        where: {
          conversationId,
          ...(lastMemory ? { timestamp: { gt: lastMemory.createdAt } } : {})
        },
        orderBy: { timestamp: 'asc' },
        select: { id: true }
      });

      if (allUncompressedMessages.length <= RECENT_MESSAGES_COUNT) {
        logger.warn({ conversationId, messageCount: allUncompressedMessages.length }, 'Not enough messages to compress');
        return false;
      }

      // Pegar apenas as que foram compactadas (excluindo últimas RECENT_MESSAGES_COUNT)
      const compressedMessages = allUncompressedMessages.slice(0, -RECENT_MESSAGES_COUNT);

      if (compressedMessages.length === 0) {
        logger.warn({ conversationId }, 'No messages to compress after excluding recent');
        return false;
      }

      const startMessageId = compressedMessages[0].id;
      const endMessageId = compressedMessages[compressedMessages.length - 1].id;

      // Salvar memória
      await this.saveMemory(conversationId, memory, startMessageId, endMessageId);

      logger.info({
        conversationId,
        messagesCompressed: compressedMessages.length,
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
export {
  MAX_CONTEXT_TOKENS,
  MAX_COMPRESSED_TOKENS,
  RECENT_MESSAGES_COUNT
};
