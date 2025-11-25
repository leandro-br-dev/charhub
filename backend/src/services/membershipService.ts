// backend/src/services/membershipService.ts
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { MembershipRole } from '../generated/prisma';
import jwt from 'jsonwebtoken';

interface InviteToken {
  conversationId: string;
  inviterId: string;
  expiresAt: number;
}

export class MembershipService {
  /**
   * Convida usuário para conversa
   */
  async inviteUser(
    conversationId: string,
    invitedUserId: string,
    inviterId: string
  ) {
    // Buscar conversa primeiro para verificar ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: { where: { isActive: true } }
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verificar se inviter tem permissão (owner da conversa OU membro com canInvite)
    const isOwner = conversation.userId === inviterId;

    if (!isOwner) {
      const inviter = await prisma.userConversationMembership.findUnique({
        where: {
          conversationId_userId: { conversationId, userId: inviterId }
        }
      });

      if (!inviter || !inviter.canInvite) {
        throw new Error('You do not have permission to invite users');
      }
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
   * Verifica tanto ownership direto (conversas não multi-user) quanto membership (multi-user)
   */
  async hasAccess(conversationId: string, userId: string): Promise<boolean> {
    // Primeiro verifica se é o dono da conversa (para conversas não multi-user)
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true }
    });

    if (conversation?.userId === userId) {
      return true;
    }

    // Depois verifica membership (para conversas multi-user)
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

  /**
   * Gerar link de convite compartilhável
   */
  async generateInviteLink(conversationId: string, inviterId: string, origin?: string): Promise<string> {
    // Buscar conversa primeiro para verificar ownership e configs
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        userId: true,
        isMultiUser: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verificar se inviter tem permissão (owner OU membro com canInvite)
    const isOwner = conversation.userId === inviterId;

    if (!isOwner) {
      // Se não é owner, precisa ser multi-user e ter permissão
      if (!conversation.isMultiUser) {
        throw new Error('You do not have permission to invite users');
      }

      const inviter = await prisma.userConversationMembership.findUnique({
        where: {
          conversationId_userId: { conversationId, userId: inviterId }
        }
      });

      if (!inviter || !inviter.canInvite) {
        throw new Error('You do not have permission to invite users');
      }
    }

    // Gerar JWT token (válido por 7 dias)
    const payload: InviteToken = {
      conversationId,
      inviterId,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dias
    };

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: '7d'
    });

    // Usar origin da requisição se disponível, senão fallback para FRONTEND_URL
    const baseUrl = origin || process.env.FRONTEND_URL || 'https://dev.charhub.app';
    // Usar 'invite' em vez de 'token' para não conflitar com OAuth token
    return `${baseUrl}/chat/${conversationId}/join?invite=${token}`;
  }

  /**
   * Aceitar convite via token JWT
   */
  async acceptInviteByToken(token: string, userId: string) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Verificar e decodificar token
    let payload: InviteToken;
    try {
      payload = jwt.verify(token, jwtSecret) as InviteToken;
    } catch (error) {
      throw new Error('Invalid or expired invite link');
    }

    const { conversationId, inviterId } = payload;

    // Verificar se conversa ainda existe
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: { where: { isActive: true } } }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verificar se já é membro
    const existingMembership = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      }
    });

    if (existingMembership?.isActive) {
      // Já é membro ativo, apenas retornar sucesso
      return {
        success: true,
        message: 'You are already a member of this conversation',
        conversationId
      };
    }

    // Se o chat é solo (não multi-user), converter para multi-user
    let shouldConvertToMultiUser = false;
    if (!conversation.isMultiUser) {
      shouldConvertToMultiUser = true;
    }

    // Verificar limite de usuários (somente se já era multi-user)
    if (!shouldConvertToMultiUser && conversation.members.length >= conversation.maxUsers) {
      throw new Error(`Conversation has reached maximum users (${conversation.maxUsers})`);
    }

    // Usar transação para garantir atomicidade
    try {
      await prisma.$transaction(async (tx) => {
        logger.info({ conversationId, shouldConvertToMultiUser, userId }, '[TRANSACTION START] Accept invite by token');

        // 1. Se precisa converter, fazer a conversão primeiro
        if (shouldConvertToMultiUser) {
          logger.info({ conversationId }, '[TRANSACTION] Converting to multi-user...');

          await tx.conversation.update({
            where: { id: conversationId },
            data: {
              isMultiUser: true,
              maxUsers: 4, // Padrão: 4 usuários
              allowUserInvites: true,
              requireApproval: false
            }
          });

          logger.info({ conversationId }, '[TRANSACTION] Conversation converted successfully');

          // 2. Verificar se owner já tem membership (pode ter sido criado antes)
          const ownerMembership = await tx.userConversationMembership.findUnique({
            where: {
              conversationId_userId: {
                conversationId,
                userId: conversation.userId
              }
            }
          });

          logger.info({ conversationId, ownerId: conversation.userId, hasOwnerMembership: !!ownerMembership }, '[TRANSACTION] Checking owner membership');

          // 3. Criar membership para o owner original (se não existir)
          if (!ownerMembership) {
            logger.info({ conversationId, ownerId: conversation.userId }, '[TRANSACTION] Creating owner membership...');

            await tx.userConversationMembership.create({
              data: {
                conversationId,
                userId: conversation.userId, // Owner original
                role: 'OWNER',
                canWrite: true,
                canInvite: true,
                canModerate: true,
                isActive: true
              }
            });

            logger.info({ conversationId, ownerId: conversation.userId }, '[TRANSACTION] Owner membership created');
          } else if (!ownerMembership.isActive) {
            // Se existe mas está inativo, reativar e promover a OWNER
            logger.info({ conversationId, ownerId: conversation.userId }, '[TRANSACTION] Reactivating owner membership...');

            await tx.userConversationMembership.update({
              where: { id: ownerMembership.id },
              data: {
                role: 'OWNER',
                canWrite: true,
                canInvite: true,
                canModerate: true,
                isActive: true
              }
            });

            logger.info({ conversationId, ownerId: conversation.userId }, '[TRANSACTION] Owner membership reactivated');
          }

          logger.info({
            conversationId,
            ownerId: conversation.userId
          }, 'Solo conversation converted to multi-user');

          // Criar ConversationParticipant do tipo USER para o owner original
          logger.info({ conversationId, ownerId: conversation.userId }, '[TRANSACTION] Creating conversation participant for owner...');

          const ownerParticipant = await tx.conversationParticipant.findFirst({
            where: {
              conversationId,
              userId: conversation.userId
            }
          });

          if (!ownerParticipant) {
            await tx.conversationParticipant.create({
              data: {
                conversationId,
                userId: conversation.userId
              }
            });

            logger.info({ conversationId, ownerId: conversation.userId }, '[TRANSACTION] Conversation participant created for owner');
          }
        }

        // 4. Criar ou reativar membership do usuário convidado
        logger.info({ conversationId, userId, hasExistingMembership: !!existingMembership }, '[TRANSACTION] Processing invited user membership');

        if (existingMembership && !existingMembership.isActive) {
          // Reativar
          logger.info({ conversationId, userId }, '[TRANSACTION] Reactivating invited user membership...');

          await tx.userConversationMembership.update({
            where: { id: existingMembership.id },
            data: {
              isActive: true,
              invitedBy: inviterId
            }
          });

          logger.info({
            conversationId,
            userId,
            inviterId
          }, 'User membership reactivated via invite link');
        } else if (!existingMembership) {
          // Criar novo
          logger.info({ conversationId, userId }, '[TRANSACTION] Creating invited user membership...');

          await tx.userConversationMembership.create({
            data: {
              conversationId,
              userId,
              invitedBy: inviterId,
              role: 'MEMBER',
              canWrite: true,
              canInvite: shouldConvertToMultiUser ? true : (conversation.allowUserInvites || false),
              canModerate: false
            }
          });

          logger.info({
            conversationId,
            userId,
            inviterId,
            wasConverted: shouldConvertToMultiUser
          }, 'User joined via invite link');

          // Criar ConversationParticipant do tipo USER para o convidado
          logger.info({ conversationId, userId }, '[TRANSACTION] Creating conversation participant for invited user...');

          await tx.conversationParticipant.create({
            data: {
              conversationId,
              userId
            }
          });

          logger.info({ conversationId, userId }, '[TRANSACTION] Conversation participant created for invited user');
        }

        logger.info({ conversationId, userId }, '[TRANSACTION SUCCESS] All operations completed');
      });

      logger.info({ conversationId, userId }, '[TRANSACTION COMMITTED] Changes saved to database');
    } catch (error) {
      logger.error({ error, conversationId, userId }, '[TRANSACTION FAILED] Rolling back all changes');
      throw error;
    }

    return {
      success: true,
      message: shouldConvertToMultiUser
        ? 'Successfully joined conversation (converted to multi-user)'
        : 'Successfully joined conversation',
      conversationId,
      wasConverted: shouldConvertToMultiUser
    };
  }
}

export const membershipService = new MembershipService();
