// backend/src/services/presenceService.ts
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../config/logger';

interface PresenceData {
  userId: string;
  socketId: string;
  conversationId: string;
  joinedAt: Date;
}

export class PresenceService {
  private presence: Map<string, PresenceData[]> = new Map(); // conversationId -> users[]

  /**
   * Usuário entrou na conversa
   */
  userJoined(conversationId: string, userId: string, socketId: string) {
    const conversationUsers = this.presence.get(conversationId) || [];

    // Verificar se já está presente (múltiplas tabs)
    const existing = conversationUsers.find(p => p.userId === userId);
    if (!existing) {
      conversationUsers.push({
        userId,
        socketId,
        conversationId,
        joinedAt: new Date()
      });
      this.presence.set(conversationId, conversationUsers);
      logger.debug({ conversationId, userId }, 'User joined conversation');
    } else {
      // Atualizar socketId (tab reload)
      existing.socketId = socketId;
      logger.debug({ conversationId, userId }, 'User socket updated');
    }

    return this.getOnlineUsers(conversationId);
  }

  /**
   * Usuário saiu da conversa
   */
  userLeft(conversationId: string, userId: string, socketId: string) {
    const conversationUsers = this.presence.get(conversationId) || [];
    const filtered = conversationUsers.filter(
      p => !(p.userId === userId && p.socketId === socketId)
    );

    if (filtered.length === 0) {
      this.presence.delete(conversationId);
    } else {
      this.presence.set(conversationId, filtered);
    }

    logger.debug({ conversationId, userId }, 'User left conversation');
    return this.getOnlineUsers(conversationId);
  }

  /**
   * Obter usuários online na conversa
   */
  getOnlineUsers(conversationId: string): string[] {
    const users = this.presence.get(conversationId) || [];
    const userIds = users.map(p => p.userId);
    // Deduplicate (múltiplas tabs)
    return Array.from(new Set(userIds));
  }

  /**
   * Verificar se usuário está online em uma conversa
   */
  isUserOnline(conversationId: string, userId: string): boolean {
    const users = this.presence.get(conversationId) || [];
    return users.some(p => p.userId === userId);
  }

  /**
   * Obter todos os sockets de um usuário em uma conversa
   */
  getUserSockets(conversationId: string, userId: string): string[] {
    const users = this.presence.get(conversationId) || [];
    return users.filter(p => p.userId === userId).map(p => p.socketId);
  }

  /**
   * Limpar socket desconectado
   */
  cleanupSocket(socketId: string) {
    const entries = Array.from(this.presence.entries());
    for (const [conversationId, users] of entries) {
      const filtered = users.filter(p => p.socketId !== socketId);
      if (filtered.length === 0) {
        this.presence.delete(conversationId);
      } else {
        this.presence.set(conversationId, filtered);
      }
    }

    logger.debug({ socketId }, 'Socket cleaned up from presence');
  }

  /**
   * Broadcast typing indicator
   */
  emitTyping(
    io: SocketIOServer,
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) {
    const room = `conversation:${conversationId}`;
    io.to(room).emit(isTyping ? 'user_typing_start' : 'user_typing_stop', {
      conversationId,
      userId
    });

    logger.debug({
      conversationId,
      userId,
      isTyping
    }, 'Typing indicator emitted');
  }

  /**
   * Broadcast presence update to all members
   */
  broadcastPresence(io: SocketIOServer, conversationId: string) {
    const onlineUsers = this.getOnlineUsers(conversationId);
    const room = `conversation:${conversationId}`;

    io.to(room).emit('presence_update', {
      conversationId,
      onlineUsers
    });

    logger.debug({
      conversationId,
      onlineCount: onlineUsers.length
    }, 'Presence update broadcasted');
  }

  /**
   * Obter estatísticas de presença
   */
  getStats() {
    const totalConversations = this.presence.size;
    let totalUsers = 0;
    let totalSockets = 0;

    const values = Array.from(this.presence.values());
    for (const users of values) {
      totalSockets += users.length;
      const uniqueUsers = Array.from(new Set(users.map(p => p.userId)));
      totalUsers += uniqueUsers.length;
    }

    return {
      totalConversations,
      totalUsers,
      totalSockets
    };
  }

  /**
   * Limpar todas as presenças (útil para testes)
   */
  clear() {
    this.presence.clear();
    logger.info('All presence data cleared');
  }
}

export const presenceService = new PresenceService();
