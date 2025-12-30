import { EMPTY_CHARACTER_FORM, type Character, type CharacterFormValues } from '../../../../types/characters';

export function characterToFormValues(character: Character): CharacterFormValues {
  // Handle species - can be string (ID) or object { id, name } or null
  const speciesValue = character.species
    ? typeof character.species === 'string'
      ? character.species
      : character.species.id
    : null;

  return {
    ...EMPTY_CHARACTER_FORM,
    firstName: character.firstName,
    lastName: character.lastName ?? null,
    age: character.age ?? null,
    gender: character.gender ?? null,
    species: speciesValue,
    style: character.style ?? null,
    avatar: character.avatar ?? null,
    physicalCharacteristics: character.physicalCharacteristics ?? null,
    personality: character.personality ?? null,
    history: character.history ?? null,
    visibility: character.visibility,
    originalLanguageCode: character.originalLanguageCode ?? 'en',
    ageRating: character.ageRating,
    contentTags: [...character.contentTags],
    loraId: character.loraId ?? null,
    mainAttireId: character.mainAttireId ?? null,
    tagIds: character.tags ? character.tags.map(tag => tag.id) : [],
    attireIds: character.attires ? character.attires.map(attire => attire.id) : [],
    stickers: character.stickers ?? [],
    cover: (character.images || []).find(img => img.type === 'COVER')?.url ?? null
  };
}
