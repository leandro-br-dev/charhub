import { prisma } from '../config/database';

/**
 * Generates a random 6-digit number
 */
function generateRandomSuffix(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalizes a name by removing special characters and converting to lowercase
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .slice(0, 20); // Limit length
}

/**
 * Extracts first and last name from display name
 */
function extractNames(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/);

  if (parts.length === 0) {
    return { firstName: 'user', lastName: '' };
  }

  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

  return { firstName, lastName };
}

/**
 * Generates a unique username from display name
 * Format: firstnamelastname123456
 * If displayName is not provided, generates a generic username
 */
export async function generateUniqueUsername(displayName?: string | null): Promise<string> {
  let baseUsername: string;

  if (!displayName || displayName.trim() === '') {
    // Fallback for missing display name
    baseUsername = 'user';
  } else {
    const { firstName, lastName } = extractNames(displayName);
    const normalizedFirst = normalizeName(firstName);
    const normalizedLast = normalizeName(lastName);

    baseUsername = normalizedFirst + normalizedLast;

    // Ensure we have at least something
    if (baseUsername === '') {
      baseUsername = 'user';
    }
  }

  // Try up to 10 times to generate a unique username
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = generateRandomSuffix();
    const username = `${baseUsername}${suffix}`;

    // Check if username exists
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existing) {
      return username;
    }
  }

  // Fallback: use timestamp-based suffix
  const timestamp = Date.now().toString().slice(-6);
  return `${baseUsername}${timestamp}`;
}
