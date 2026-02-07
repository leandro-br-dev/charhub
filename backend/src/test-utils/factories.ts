/**
 * Test data factories
 * Helper functions to create test data
 */
import { getTestDb } from './database';

/**
 * Create test user
 */
export async function createTestUser(overrides: any = {}) {
  const db = getTestDb();

  const timestamp = Date.now();

  // Handle blockedTags: null by converting to empty array (Prisma doesn't accept null for arrays)
  const cleanedOverrides = { ...overrides };
  if (cleanedOverrides.blockedTags === null) {
    delete cleanedOverrides.blockedTags; // Omit field, will use schema default (empty array)
  }

  // Set a default birthdate to avoid age filtering issues
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

  const defaultData = {
    email: `test-${timestamp}@example.com`,
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    provider: 'GOOGLE',
    providerAccountId: `account_${timestamp}`,
    birthDate: eighteenYearsAgo, // User is 18+ years old
    role: 'BASIC', // Default role for test users
    ...cleanedOverrides,
  };

  return await db.user.create({
    data: defaultData,
  });
}

/**
 * Create test user with initial balance
 */
export async function createTestUserWithBalance(balance: number, overrides: any = {}) {
  const db = getTestDb();
  const user = await createTestUser(overrides);

  // Create initial credit transaction to set balance
  await db.creditTransaction.create({
    data: {
      userId: user.id,
      transactionType: 'GRANT_INITIAL',
      amountCredits: balance,
      balanceAfter: balance,
      notes: 'Test initial balance',
    },
  });

  return user;
}

/**
 * Create test plan
 */
export async function createTestPlan(overrides: any = {}) {
  const db = getTestDb();

  const defaultData = {
    tier: 'FREE',
    name: 'Test Plan',
    description: 'Test plan description',
    priceMonthly: 0,
    creditsPerMonth: 200,
    isActive: true,
    ...overrides,
  };

  return await db.plan.create({
    data: defaultData,
  });
}

/**
 * Create test user plan (subscription)
 */
export async function createTestUserPlan(userId: string, planId: string, overrides: any = {}) {
  const db = getTestDb();

  const now = new Date();
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  const defaultData = {
    userId,
    planId,
    status: 'ACTIVE',
    currentPeriodStart: now,
    currentPeriodEnd: oneMonthLater,
    ...overrides,
  };

  return await db.userPlan.create({
    data: defaultData,
  });
}

/**
 * Create test credit transaction
 */
export async function createTestTransaction(userId: string, overrides: any = {}) {
  const db = getTestDb();

  const defaultData = {
    userId,
    transactionType: 'SYSTEM_REWARD',
    amountCredits: 10,
    balanceAfter: 10,
    notes: 'Test transaction',
    ...overrides,
  };

  return await db.creditTransaction.create({
    data: defaultData,
  });
}

/**
 * Create test character
 */
export async function createTestCharacter(creatorId: string, overrides: any = {}) {
  const db = getTestDb();
  const timestamp = Date.now();

  const defaultData = {
    userId: creatorId,  // Changed from creatorId to userId
    firstName: `TestChar${timestamp}`,
    lastName: 'Character',
    gender: 'FEMALE',  // Use enum value
    visibility: 'PUBLIC',
    ageRating: 'TWELVE',  // Valid AgeRating enum value
    personality: 'A test character personality',
    physicalCharacteristics: 'Test appearance',
    history: 'Test background story',
    ...overrides,
  };

  const character = await db.character.create({
    data: defaultData,
  });

  // Create avatar image
  await db.characterImage.create({
    data: {
      characterId: character.id,
      type: 'AVATAR',
      url: `https://example.com/character-${character.id}.jpg`,
      isActive: true,
    },
  });

  return character;
}

/**
 * Create test conversation with participants
 */
export async function createTestConversationWithParticipants(
  userId: string,
  participantConfig: {
    characterIds?: string[];
    includeUser?: boolean;
  } = {}
) {
  const db = getTestDb();
  const { characterIds = [], includeUser = true } = participantConfig;

  // Create conversation
  const conversation = await db.conversation.create({
    data: {
      userId,
      title: 'Test Conversation',
    },
  });

  // Add user participant if requested
  let userParticipantId = null;
  if (includeUser) {
    const userParticipant = await db.conversationParticipant.create({
      data: {
        conversationId: conversation.id,
        userId,
      },
    });
    userParticipantId = userParticipant.id;
  }

  // Add character participants
  const characterParticipants = [];
  for (const characterId of characterIds) {
    const participant = await db.conversationParticipant.create({
      data: {
        conversationId: conversation.id,
        actingCharacterId: characterId,
      },
    });
    characterParticipants.push(participant);
  }

  return {
    conversation,
    userParticipantId,
    characterParticipants,
  };
}

/**
 * Create test message
 */
export async function createTestMessage(
  conversationId: string,
  senderId: string,
  senderType: 'USER' | 'CHARACTER' | 'ASSISTANT',
  content: string,
  overrides: any = {}
) {
  const db = getTestDb();

  const defaultData = {
    conversationId,
    senderId,
    senderType,
    content,
    timestamp: new Date(),
    ...overrides,
  };

  return await db.message.create({
    data: defaultData,
  });
}

/**
 * Create test asset
 */
export async function createTestAsset(authorId: string, overrides: any = {}) {
  const db = getTestDb();
  const timestamp = Date.now();

  const defaultData = {
    name: `TestAsset${timestamp}`,
    description: 'A test asset description',
    type: 'OBJECT',
    category: 'HOLDABLE',
    visibility: 'PUBLIC',
    authorId,
    previewImageUrl: `https://example.com/asset-${timestamp}.jpg`,
    ...overrides,
  };

  return await db.asset.create({
    data: defaultData,
  });
}

/**
 * Create test scene
 */
export async function createTestScene(authorId: string, overrides: any = {}) {
  const db = getTestDb();
  const timestamp = Date.now();

  const defaultData = {
    name: `TestScene${timestamp}`,
    description: 'A test scene description',
    shortDescription: 'Short description',
    genre: 'Fantasy',
    era: 'Medieval',
    mood: 'Mysterious',
    style: 'REALISTIC',
    ageRating: 'TWELVE',
    contentTags: [],
    visibility: 'PUBLIC',
    authorId,
    ...overrides,
  };

  return await db.scene.create({
    data: defaultData,
  });
}

/**
 * Create test scene area
 */
export async function createTestSceneArea(sceneId: string, overrides: any = {}) {
  const db = getTestDb();
  const timestamp = Date.now();

  const defaultData = {
    name: `TestArea${timestamp}`,
    description: 'A test area description',
    shortDescription: 'Short area description',
    displayOrder: 0,
    isAccessible: true,
    sceneId,
    ...overrides,
  };

  return await db.sceneArea.create({
    data: defaultData,
  });
}

/**
 * Create test scene area connection
 */
export async function createTestSceneAreaConnection(
  fromAreaId: string,
  toAreaId: string,
  overrides: any = {}
) {
  const db = getTestDb();

  const defaultData = {
    fromAreaId,
    toAreaId,
    direction: 'North',
    description: 'A path to the north',
    isLocked: false,
    ...overrides,
  };

  return await db.sceneAreaConnection.create({
    data: defaultData,
  });
}

/**
 * Link asset to area
 */
export async function linkTestAssetToArea(
  areaId: string,
  assetId: string,
  overrides: any = {}
) {
  const db = getTestDb();

  const defaultData = {
    areaId,
    assetId,
    position: 'on the table',
    isHidden: false,
    isInteractable: true,
    displayOrder: 0,
    ...overrides,
  };

  return await db.sceneAreaAsset.create({
    data: defaultData,
  });
}
