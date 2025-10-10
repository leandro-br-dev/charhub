import { EMPTY_CHARACTER_FORM, type Character, type CharacterFormValues } from '../../../../types/characters';

export function characterToFormValues(character: Character): CharacterFormValues {
  return {
    ...EMPTY_CHARACTER_FORM,
    firstName: character.firstName,
    lastName: character.lastName ?? null,
    age: character.age ?? null,
    gender: character.gender ?? null,
    species: character.species ?? null,
    style: character.style ?? null,
    avatar: character.avatar ?? null,
    physicalCharacteristics: character.physicalCharacteristics ?? null,
    personality: character.personality ?? null,
    history: character.history ?? null,
    isPublic: character.isPublic,
    purpose: character.purpose ?? 'chat',
    originalLanguageCode: character.originalLanguageCode ?? 'en',
    ageRating: character.ageRating,
    contentTags: [...character.contentTags],
    loraId: character.loraId ?? null,
    mainAttireId: character.mainAttireId ?? null,
    tagIds: character.tags ? character.tags.map(tag => tag.id) : [],
    attireIds: character.attires ? character.attires.map(attire => attire.id) : [],
    stickers: character.stickers ?? []
  };
}
