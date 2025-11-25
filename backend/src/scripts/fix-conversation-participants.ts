import { PrismaClient } from '../generated/prisma';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

/**
 * Script to fix missing ConversationParticipant entries for users in multi-user conversations.
 *
 * This script:
 * 1. Finds all multi-user conversations
 * 2. For each conversation, checks UserConversationMembership records
 * 3. Creates missing ConversationParticipant entries for users who have memberships but no participant entry
 */

async function fixConversationParticipants() {
  try {
    console.log('🔍 Finding multi-user conversations...');

    // Find all multi-user conversations
    const multiUserConversations = await prisma.conversation.findMany({
      where: { isMultiUser: true },
      include: {
        members: {
          where: { isActive: true },
          include: { user: true }
        },
        participants: true
      }
    });

    console.log(`📊 Found ${multiUserConversations.length} multi-user conversations`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const conversation of multiUserConversations) {
      console.log(`\n📝 Processing conversation ${conversation.id}...`);
      console.log(`   Members: ${conversation.members.length}`);
      console.log(`   Participants: ${conversation.participants.length}`);

      // For each active member, check if they have a ConversationParticipant entry
      for (const member of conversation.members) {
        const existingParticipant = conversation.participants.find(
          p => p.userId === member.userId
        );

        if (existingParticipant) {
          console.log(`   ✓ User ${member.user.displayName} (${member.userId.slice(0, 8)}) already has participant entry`);
          totalSkipped++;
        } else {
          console.log(`   ⚠️  User ${member.user.displayName} (${member.userId.slice(0, 8)}) is missing participant entry - creating...`);

          try {
            await prisma.conversationParticipant.create({
              data: {
                conversationId: conversation.id,
                userId: member.userId
              }
            });

            console.log(`   ✅ Created ConversationParticipant for ${member.user.displayName}`);
            totalCreated++;
          } catch (error) {
            console.error(`   ❌ Failed to create participant for ${member.user.displayName}:`, error);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${totalCreated} participant entries`);
    console.log(`   ⏭️  Skipped: ${totalSkipped} (already exist)`);
    console.log('='.repeat(50));
    console.log('✅ Script completed successfully!');

  } catch (error) {
    console.error('❌ Error running script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixConversationParticipants()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
