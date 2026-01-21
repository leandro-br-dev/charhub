import { logger } from '../../../config/logger';
import { User } from '../../../generated/prisma';
import {
  UserConfigOverride,
  UserContextFormatOptions,
  FormattedUserContext,
  PersonaCharacter,
} from '../context.types';

/**
 * Helper function to parse user config from configOverride field
 * Handles both JSON format (for users) and plain string format
 */
export function parseUserConfig(configOverride: string | null | undefined): UserConfigOverride | null {
  if (!configOverride) return null;

  try {
    // Try to parse as JSON first (for user configs)
    const parsed = JSON.parse(configOverride);

    // Validate it has the expected structure
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as UserConfigOverride;
    }

    // Not a valid object, treat as plain string
    return { instructions: configOverride };
  } catch {
    // If JSON parsing fails, treat entire value as plain instructions
    return { instructions: configOverride };
  }
}

/**
 * Formats user information for context in prompts with persona support
 * This method handles when a user is roleplaying as a character
 */
function formatUserContextWithPersona(
  user: User,
  userParticipant: any,
  personaCharacter?: PersonaCharacter | null
): string {
  const contextParts: string[] = [];

  // If user has assumed a persona, use that identity
  if (personaCharacter) {
    const personaName = personaCharacter.firstName +
      (personaCharacter.lastName ? ` ${personaCharacter.lastName}` : '');

    contextParts.push(`⚠️ USER IS ROLEPLAYING AS: ${personaName}`);
    contextParts.push(`- Persona Name: ${personaName}`);

    if (personaCharacter.physicalCharacteristics) {
      contextParts.push(`- Persona Appearance: ${personaCharacter.physicalCharacteristics}`);
    }
    if (personaCharacter.personality) {
      contextParts.push(`- Persona Personality: ${personaCharacter.personality}`);
    }
    if (personaCharacter.gender) {
      contextParts.push(`- Persona Gender: ${personaCharacter.gender}`);
    }

    contextParts.push(`\n⚠️ IMPORTANT: Address this user as "${personaName}" and treat them according to the persona characteristics above.`);
  } else {
    // Parse configOverride for user-specific settings
    const config = parseUserConfig(userParticipant?.configOverride);

    // DEBUG: Log config parsing
    logger.debug({
      userId: user.id,
      rawConfigOverride: userParticipant?.configOverride,
      parsedConfig: config,
      userGender: user.gender,
      userName: user.displayName,
    }, 'DEBUG: User config parsing');

    // Name: use override if set, otherwise user's default
    const displayName = config?.nameOverride || user.displayName;

    // DEBUG: Log final name decision
    logger.debug({
      userId: user.id,
      nameOverride: config?.nameOverride,
      userName: user.displayName,
      finalName: displayName,
    }, 'DEBUG: Name override decision');

    if (displayName) {
      contextParts.push(`- Name: ${displayName}`);
    }

    // Age: use override if set (show just the number, NOT birth date)
    if (config?.ageOverride) {
      contextParts.push(`- Age: ${config.ageOverride}`);
    }

    // Gender: use override if set, otherwise user's default
    const gender = config?.genderOverride || user.gender;

    // DEBUG: Log final gender decision
    logger.debug({
      userId: user.id,
      genderOverride: config?.genderOverride,
      userGender: user.gender,
      finalGender: gender,
    }, 'DEBUG: Gender override decision');

    if (gender) {
      contextParts.push(`- Gender: ${gender}`);
    }

    // Additional description override
    if (config?.descriptionOverride) {
      contextParts.push(`- Additional Notes: ${config.descriptionOverride}`);
    }

    // User instructions for this conversation
    if (config?.instructions) {
      contextParts.push(`\n📝 Additional User Instructions:\n${config.instructions}`);
    }

    // PII PROTECTION: Only display name, age, gender, and description override are exposed
    // Birth date and other sensitive data are NEVER sent to the LLM
    // avatarOverride is for frontend display only, NOT included in LLM context
    // preferredLanguage is used for language selection but NOT shown in user context
  }

  if (contextParts.length === 0) {
    return '- No additional information available about the user';
  }

  return contextParts.join('\n');
}

/**
 * Main export function to format user context
 * Returns formatted context string, display name, and gender
 */
export function formatUserContext(options: UserContextFormatOptions): FormattedUserContext {
  const { user, userParticipant, personaCharacter } = options;

  // Format the context string
  const context = formatUserContextWithPersona(user, userParticipant, personaCharacter);

  // Determine display name (use persona name if available)
  let displayName: string;
  if (personaCharacter) {
    displayName = `${personaCharacter.firstName}${personaCharacter.lastName ? ' ' + personaCharacter.lastName : ''}`;
  } else {
    const config = parseUserConfig(userParticipant?.configOverride);
    displayName = config?.nameOverride || user.displayName || 'User';
  }

  // Determine gender (use persona gender if available)
  let gender: string;
  if (personaCharacter?.gender) {
    gender = personaCharacter.gender;
  } else {
    const config = parseUserConfig(userParticipant?.configOverride);
    gender = config?.genderOverride || user.gender || 'not specified';
  }

  return {
    context,
    displayName,
    gender,
  };
}

/**
 * Formats user information for context in prompts
 * PII PROTECTION: Only exposes displayName and gender (no birth date, age, or other sensitive data)
 */
export function formatBasicUserContext(user: User): string {
  const contextParts: string[] = [];

  // Display name only
  if (user.displayName) {
    contextParts.push(`- Name: ${user.displayName}`);
  }

  // Gender only
  if (user.gender) {
    contextParts.push(`- Gender: ${user.gender}`);
  }

  // If no information available
  if (contextParts.length === 0) {
    return '- No additional information available about the user';
  }

  return contextParts.join('\n');
}
