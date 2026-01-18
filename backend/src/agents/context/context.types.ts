import { User } from '../../generated/prisma';

/**
 * Type for user config override (JSON stored in configOverride field for users)
 */
export interface UserConfigOverride {
  instructions?: string;
  nameOverride?: string;
  ageOverride?: number;
  genderOverride?: string;
  avatarOverride?: string;
  descriptionOverride?: string;
}

/**
 * Options for formatting user context
 */
export interface UserContextFormatOptions {
  user: User;
  userParticipant: any;
  personaCharacter?: PersonaCharacter | null;
}

/**
 * Persona character structure from database
 */
export interface PersonaCharacter {
  id: string;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  physicalCharacteristics: string | null;
  personality: string | null;
}

/**
 * Result of formatting user context
 */
export interface FormattedUserContext {
  context: string;
  displayName: string;
  gender: string;
}
