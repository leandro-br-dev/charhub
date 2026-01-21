/**
 * User Context Formatter Unit Tests
 * Tests for parseUserConfig and formatUserContext functions
 */
import {
  parseUserConfig,
  formatUserContext,
  formatBasicUserContext,
} from '../formatters/userContextFormatter';
import type { PersonaCharacter } from '../context.types';

describe('parseUserConfig', () => {
  it('should parse valid JSON config', () => {
    const jsonConfig = JSON.stringify({
      instructions: 'Test instructions',
      nameOverride: 'TestName',
      ageOverride: 25,
      genderOverride: 'male',
      avatarOverride: 'https://example.com/avatar.jpg',
      descriptionOverride: 'Test description',
    });

    const result = parseUserConfig(jsonConfig);

    expect(result).toEqual({
      instructions: 'Test instructions',
      nameOverride: 'TestName',
      ageOverride: 25,
      genderOverride: 'male',
      avatarOverride: 'https://example.com/avatar.jpg',
      descriptionOverride: 'Test description',
    });
  });

  it('should return null for null input', () => {
    expect(parseUserConfig(null)).toBeNull();
    expect(parseUserConfig(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseUserConfig('')).toBeNull();
  });

  it('should treat non-JSON string as instructions', () => {
    const plainString = 'Just some plain instructions';
    const result = parseUserConfig(plainString);

    expect(result).toEqual({
      instructions: plainString,
    });
  });

  it('should handle malformed JSON gracefully', () => {
    const malformedJson = '{"instructions": "missing bracket';
    const result = parseUserConfig(malformedJson);

    expect(result).toEqual({
      instructions: malformedJson,
    });
  });

  it('should handle JSON array (edge case - arrays are returned as-is)', () => {
    const jsonArray = '["item1", "item2"]';
    const result = parseUserConfig(jsonArray);

    // Arrays are objects in JavaScript, so they pass the `typeof === 'object'` check
    // This is edge case behavior - arrays aren't really UserConfigOverride objects
    // The function returns them directly due to the object check
    expect(result).toEqual(["item1", "item2"]);
  });

  it('should handle JSON primitive (return as instructions)', () => {
    const jsonPrimitive = '42';
    const result = parseUserConfig(jsonPrimitive);

    expect(result).toEqual({
      instructions: jsonPrimitive,
    });
  });

  it('should parse partial config (some fields missing)', () => {
    const partialConfig = JSON.stringify({
      instructions: 'Test instructions',
      nameOverride: 'TestName',
    });

    const result = parseUserConfig(partialConfig);

    expect(result).toEqual({
      instructions: 'Test instructions',
      nameOverride: 'TestName',
    });
    expect(result?.ageOverride).toBeUndefined();
    expect(result?.genderOverride).toBeUndefined();
  });
});

describe('formatUserContextWithPersona', () => {
  // Mock user and participant data
  const mockUser = {
    id: 'user-123',
    displayName: 'John Doe',
    email: 'john@example.com',
    gender: 'male',
    preferredLanguage: 'en',
    birthDate: new Date('1990-01-01'),
  };

  const mockUserParticipant = {
    id: 'participant-123',
    userId: 'user-123',
    configOverride: null,
  };

  it('should format context with persona character', () => {
    const mockPersonaCharacter: PersonaCharacter = {
      id: 'persona-123',
      firstName: 'Aragorn',
      lastName: 'Elessar',
      gender: 'male',
      physicalCharacteristics: 'Tall, rugged, weathered',
      personality: 'Brave, noble, reluctant leader',
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: mockUserParticipant,
      personaCharacter: mockPersonaCharacter,
    });

    expect(result.context).toContain('USER IS ROLEPLAYING AS: Aragorn Elessar');
    expect(result.context).toContain('Persona Name: Aragorn Elessar');
    expect(result.context).toContain('Persona Appearance: Tall, rugged, weathered');
    expect(result.context).toContain('Persona Personality: Brave, noble, reluctant leader');
    expect(result.context).toContain('Persona Gender: male');
    expect(result.context).toContain('Address this user as "Aragorn Elessar"');
    expect(result.displayName).toBe('Aragorn Elessar');
    expect(result.gender).toBe('male');
  });

  it('should format context with persona without lastName', () => {
    const mockPersonaCharacter: PersonaCharacter = {
      id: 'persona-123',
      firstName: 'Madonna',
      lastName: null,
      gender: 'female',
      physicalCharacteristics: 'Iconic style',
      personality: 'Confident and bold',
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: mockUserParticipant,
      personaCharacter: mockPersonaCharacter,
    });

    expect(result.context).toContain('USER IS ROLEPLAYING AS: Madonna');
    expect(result.displayName).toBe('Madonna');
  });

  it('should format context without persona (use user defaults)', () => {
    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: mockUserParticipant,
      personaCharacter: null,
    });

    expect(result.context).toContain('Name: John Doe');
    expect(result.context).toContain('Gender: male');
    expect(result.displayName).toBe('John Doe');
    expect(result.gender).toBe('male');
  });

  it('should use nameOverride when provided', () => {
    const configOverride = JSON.stringify({
      nameOverride: 'Stranger',
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter: null,
    });

    expect(result.context).toContain('Name: Stranger');
    expect(result.displayName).toBe('Stranger');
  });

  it('should use ageOverride when provided', () => {
    const configOverride = JSON.stringify({
      ageOverride: 35,
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter: null,
    });

    expect(result.context).toContain('Age: 35');
  });

  it('should use genderOverride when provided', () => {
    const configOverride = JSON.stringify({
      genderOverride: 'female',
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter: null,
    });

    expect(result.context).toContain('Gender: female');
    expect(result.gender).toBe('female');
  });

  it('should use descriptionOverride when provided', () => {
    const configOverride = JSON.stringify({
      descriptionOverride: 'Wears a dark cloak and carries a staff',
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter: null,
    });

    expect(result.context).toContain('Additional Notes: Wears a dark cloak and carries a staff');
  });

  it('should include user instructions when provided', () => {
    const configOverride = JSON.stringify({
      instructions: 'I am playing as a medieval knight',
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter: null,
    });

    expect(result.context).toContain('Additional User Instructions:');
    expect(result.context).toContain('I am playing as a medieval knight');
  });

  it('should combine multiple overrides', () => {
    const configOverride = JSON.stringify({
      instructions: 'I am a mysterious traveler',
      nameOverride: 'Stranger',
      ageOverride: 40,
      genderOverride: 'other',
      descriptionOverride: 'Always wears a hood',
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter: null,
    });

    expect(result.context).toContain('Name: Stranger');
    expect(result.context).toContain('Age: 40');
    expect(result.context).toContain('Gender: other');
    expect(result.context).toContain('Additional Notes: Always wears a hood');
    expect(result.context).toContain('Additional User Instructions:');
    expect(result.context).toContain('I am a mysterious traveler');
    expect(result.displayName).toBe('Stranger');
    expect(result.gender).toBe('other');
  });

  it('should return default context when no info available', () => {
    const minimalUser = {
      id: 'user-456',
      displayName: null,
      email: null,
      gender: null,
      preferredLanguage: 'en',
      birthDate: null,
    };

    const result = formatUserContext({
      user: minimalUser as any,
      userParticipant: mockUserParticipant,
      personaCharacter: null,
    });

    expect(result.context).toContain('No additional information available');
  });

  it('should prioritize persona gender over user gender and override', () => {
    const personaCharacter: PersonaCharacter = {
      id: 'persona-123',
      firstName: 'WonderWoman',
      lastName: null,
      gender: 'female',
      physicalCharacteristics: 'Strong and confident',
      personality: 'Heroic',
    };

    const configOverride = JSON.stringify({
      genderOverride: 'male',
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter,
    });

    // Persona gender should take precedence
    expect(result.gender).toBe('female');
    expect(result.context).toContain('Persona Gender: female');
  });

  it('should prioritize persona name over nameOverride', () => {
    const personaCharacter: PersonaCharacter = {
      id: 'persona-123',
      firstName: 'Batman',
      lastName: null,
      gender: 'male',
      physicalCharacteristics: 'Dark costume',
      personality: 'Serious',
    };

    const configOverride = JSON.stringify({
      nameOverride: 'Bruce Wayne',
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter,
    });

    expect(result.displayName).toBe('Batman');
    expect(result.context).toContain('USER IS ROLEPLAYING AS: Batman');
  });

  it('should not expose birthDate in context (PII protection)', () => {
    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: mockUserParticipant,
      personaCharacter: null,
    });

    // Birth date should NOT be in the context string
    expect(result.context).not.toContain('1990-01-01');
    expect(result.context).not.toContain('birthDate');
  });

  it('should not expose avatarOverride in context (frontend only)', () => {
    const configOverride = JSON.stringify({
      avatarOverride: 'https://example.com/custom.jpg',
      nameOverride: 'TestUser',
    });

    const participantWithOverride = {
      ...mockUserParticipant,
      configOverride,
    };

    const result = formatUserContext({
      user: mockUser as any,
      userParticipant: participantWithOverride,
      personaCharacter: null,
    });

    // Avatar override should NOT be in context (PII/frontend-only)
    expect(result.context).not.toContain('avatarOverride');
    expect(result.context).not.toContain('https://example.com/custom.jpg');
  });

  it('should handle user without displayName gracefully', () => {
    const userWithoutName = {
      ...mockUser,
      displayName: null,
    };

    const result = formatUserContext({
      user: userWithoutName as any,
      userParticipant: mockUserParticipant,
      personaCharacter: null,
    });

    expect(result.displayName).toBe('User');
  });
});

describe('formatBasicUserContext', () => {
  it('should format basic user context without persona', () => {
    const user = {
      id: 'user-123',
      displayName: 'Jane Doe',
      gender: 'female',
      preferredLanguage: 'en',
    };

    const result = formatBasicUserContext(user as any);

    expect(result).toContain('Name: Jane Doe');
    expect(result).toContain('Gender: female');
  });

  it('should return default when no info available', () => {
    const user = {
      id: 'user-456',
      displayName: null,
      gender: null,
      preferredLanguage: 'en',
    };

    const result = formatBasicUserContext(user as any);

    expect(result).toContain('No additional information available');
  });

  it('should not include birthDate (PII protection)', () => {
    const user = {
      id: 'user-123',
      displayName: 'Test User',
      gender: 'male',
      birthDate: new Date('1985-05-15'),
    };

    const result = formatBasicUserContext(user as any);

    expect(result).not.toContain('1985-05-15');
    expect(result).not.toContain('birthDate');
  });
});
