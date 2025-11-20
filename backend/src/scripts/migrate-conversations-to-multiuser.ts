// backend/src/scripts/migrate-conversations-to-multiuser.ts
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Migrates existing single-user conversations to multi-user schema
 * Creates membership records for all existing conversation owners
 */
async function migrateConversationsToMultiUser() {
  logger.info('Starting migration of conversations to multi-user schema...');

  try {
    // Find all conversations
    const conversations = await prisma.conversation.findMany({
      select: {
        id: true,
        userId: true,
        isMultiUser: true,
        ownerUserId: true,
        createdAt: true
      }
    });

    logger.info(`Found ${conversations.length} conversations to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const conv of conversations) {
      try {
        // Check if membership already exists
        const existingMembership = await prisma.userConversationMembership.findUnique({
          where: {
            conversationId_userId: {
              conversationId: conv.id,
              userId: conv.userId
            }
          }
        });

        if (existingMembership) {
          logger.debug(`Skipping conversation ${conv.id} - membership already exists`);
          skippedCount++;
          continue;
        }

        // Create membership for the owner
        await prisma.userConversationMembership.create({
          data: {
            conversationId: conv.id,
            userId: conv.userId,
            role: 'OWNER',
            canWrite: true,
            canInvite: true,
            canModerate: true,
            joinedAt: conv.createdAt,
            isActive: true
          }
        });

        // Update conversation with ownerUserId if not set
        if (!conv.ownerUserId) {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              ownerUserId: conv.userId
            }
          });
        }

        migratedCount++;

        if (migratedCount % 100 === 0) {
          logger.info(`Progress: ${migratedCount}/${conversations.length} conversations migrated`);
        }
      } catch (error) {
        logger.error({ error, conversationId: conv.id }, 'Error migrating conversation');
        errorCount++;
      }
    }

    logger.info({
      total: conversations.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount
    }, 'Migration completed');

    // Verify migration
    const totalMemberships = await prisma.userConversationMembership.count();
    logger.info(`Total memberships created: ${totalMemberships}`);

  } catch (error) {
    logger.error({ error }, 'Migration failed');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  migrateConversationsToMultiUser()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateConversationsToMultiUser };
