// backend/src/services/membershipService.ts
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { MembershipRole } from '../generated/prisma';

export class MembershipService {
  /**
   * Convida usuário para conversa
   */
  async inviteUser(
    conversationId: string,
    invitedUserId: string,
    inviterId: string
  ) {
    // Verificar se inviter tem permissão
    const inviter = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: inviterId }
      }
    });

    if (!inviter || !inviter.canInvite) {
      throw new Error('You do not have permission to invite users');
    }

    // Verificar limite de usuários
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: { where: { isActive: true } }
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.members.length >= conversation.maxUsers) {
      throw new Error(`Conversation has reached maximum users (${conversation.maxUsers})`);
    }

    // Verificar se já é membro
    const existing = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: invitedUserId }
      }
    });

    if (existing) {
      if (existing.isActive) {
        throw new Error('User is already a member');
      } else {
        // Reativar membership
        const reactivated = await prisma.userConversationMembership.update({
          where: { id: existing.id },
          data: { isActive: true, invitedBy: inviterId }
        });

        logger.info({
          conversationId,
          userId: invitedUserId,
          inviterId
        }, 'User membership reactivated');

        return reactivated;
      }
    }

    // Criar membership
    const membership = await prisma.userConversationMembership.create({
      data: {
        conversationId,
        userId: invitedUserId,
        invitedBy: inviterId,
        role: 'MEMBER',
        canWrite: true,
        canInvite: conversation.allowUserInvites,
        canModerate: false
      }
    });

    logger.info({
      conversationId,
      userId: invitedUserId,
      inviterId,
      membershipId: membership.id
    }, 'User invited to conversation');

    return membership;
  }

  /**
   * Usuário aceita convite (join conversation)
   */
  async joinConversation(conversationId: string, userId: string) {
    const membership = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      }
    });

    if (!membership) {
      throw new Error('No invitation found');
    }

    if (membership.isActive) {
      throw new Error('Already a member');
    }

    const updated = await prisma.userConversationMembership.update({
      where: { id: membership.id },
      data: { isActive: true }
    });

    logger.info({
      conversationId,
      userId,
      membershipId: membership.id
    }, 'User joined conversation');

    return updated;
  }

  /**
   * Sair da conversa
   */
  async leaveConversation(conversationId: string, userId: string) {
    const membership = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      }
    });

    if (!membership) {
      throw new Error('Not a member');
    }

    if (membership.role === 'OWNER') {
      throw new Error('Owner cannot leave. Transfer ownership first.');
    }

    const updated = await prisma.userConversationMembership.update({
      where: { id: membership.id },
      data: { isActive: false }
    });

    logger.info({
      conversationId,
      userId,
      membershipId: membership.id
    }, 'User left conversation');

    return updated;
  }

  /**
   * Kick usuário (requer permissão de moderação)
   */
  async kickUser(
    conversationId: string,
    targetUserId: string,
    moderatorUserId: string
  ) {
    // Verificar permissão do moderator
    const moderator = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: moderatorUserId }
      }
    });

    if (!moderator || !moderator.canModerate) {
      throw new Error('You do not have permission to kick users');
    }

    // Não pode kick owner
    const target = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId }
      }
    });

    if (!target) {
      throw new Error('User is not a member');
    }

    if (target.role === 'OWNER') {
      throw new Error('Cannot kick the owner');
    }

    const updated = await prisma.userConversationMembership.update({
      where: { id: target.id},
      data: { isActive: false }
    });

    logger.info({
      conversationId,
      targetUserId,
      moderatorUserId,
      membershipId: target.id
    }, 'User kicked from conversation');

    return updated;
  }

  /**
   * Transferir ownership (futuro - não implementado no MVP)
   */
  async transferOwnership(
    conversationId: string,
    newOwnerId: string,
    currentOwnerId: string
  ) {
    // Verificar se current user é owner
    const currentOwner = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: currentOwnerId }
      }
    });

    if (!currentOwner || currentOwner.role !== 'OWNER') {
      throw new Error('Only the owner can transfer ownership');
    }

    // Verificar se novo owner é membro
    const newOwner = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: newOwnerId }
      }
    });

    if (!newOwner || !newOwner.isActive) {
      throw new Error('New owner must be an active member');
    }

    // Realizar transferência (em transação)
    await prisma.$transaction([
      // Downgrade current owner to moderator
      prisma.userConversationMembership.update({
        where: { id: currentOwner.id },
        data: {
          role: 'MODERATOR',
          canModerate: true
        }
      }),
      // Upgrade new owner
      prisma.userConversationMembership.update({
        where: { id: newOwner.id },
        data: {
          role: 'OWNER',
          canWrite: true,
          canInvite: true,
          canModerate: true
        }
      }),
      // Update conversation ownerUserId
      prisma.conversation.update({
        where: { id: conversationId },
        data: { ownerUserId: newOwnerId }
      })
    ]);

    logger.info({
      conversationId,
      oldOwnerId: currentOwnerId,
      newOwnerId
    }, 'Ownership transferred');

    return { success: true };
  }

  /**
   * Lista membros ativos
   */
  async getActiveMembers(conversationId: string) {
    return await prisma.userConversationMembership.findMany({
      where: {
        conversationId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            preferredLanguage: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { joinedAt: 'asc' }
      ]
    });
  }

  /**
   * Obter membership de um usuário
   */
  async getUserMembership(conversationId: string, userId: string) {
    return await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });
  }

  /**
   * Verificar se usuário tem acesso à conversa
   */
  async hasAccess(conversationId: string, userId: string): Promise<boolean> {
    const membership = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      }
    });

    return membership?.isActive || false;
  }

  /**
   * Verificar se usuário pode escrever na conversa
   */
  async canWrite(conversationId: string, userId: string): Promise<boolean> {
    const membership = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      }
    });

    return membership?.isActive && membership?.canWrite || false;
  }

  /**
   * Atualizar permissões de um membro
   */
  async updateMemberPermissions(
    conversationId: string,
    targetUserId: string,
    moderatorUserId: string,
    permissions: {
      role?: MembershipRole;
      canWrite?: boolean;
      canInvite?: boolean;
      canModerate?: boolean;
    }
  ) {
    // Verificar se moderator tem permissão
    const moderator = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: moderatorUserId }
      }
    });

    if (!moderator || (moderator.role !== 'OWNER' && moderator.role !== 'MODERATOR')) {
      throw new Error('You do not have permission to update member permissions');
    }

    // Verificar se target é membro
    const target = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId }
      }
    });

    if (!target) {
      throw new Error('User is not a member');
    }

    // Não pode alterar owner (exceto o próprio owner)
    if (target.role === 'OWNER' && moderatorUserId !== targetUserId) {
      throw new Error('Cannot modify owner permissions');
    }

    const updated = await prisma.userConversationMembership.update({
      where: { id: target.id },
      data: permissions
    });

    logger.info({
      conversationId,
      targetUserId,
      moderatorUserId,
      permissions
    }, 'Member permissions updated');

    return updated;
  }

  /**
   * Contar membros ativos
   */
  async countActiveMembers(conversationId: string): Promise<number> {
    return await prisma.userConversationMembership.count({
      where: {
        conversationId,
        isActive: true
      }
    });
  }
}

export const membershipService = new MembershipService();
