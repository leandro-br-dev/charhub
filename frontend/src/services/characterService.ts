import api from '../lib/api';
import {
  type Character,
  type CharacterFormValues,
  type CharacterListParams,
  type CharacterListResponse,
  type CharacterMutationResult,
  EMPTY_CHARACTER_FORM
} from '../types/characters';

const BASE_PATH = '/characters';
const USE_MOCKS = import.meta.env.VITE_USE_CHARACTER_MOCKS === 'true';

const defaultListResponse = (items: Character[]): CharacterListResponse => ({
  items,
  total: items.length,
  page: 1,
  pageSize: items.length || 1
});

const mockCharacters: Character[] = [
  {
    id: 'char-mock-001',
    firstName: 'Aiko',
    lastName: 'Tanaka',
    age: 22,
    gender: 'female',
    species: 'android',
    style: 'neo-noir',
    avatar: 'https://images.charhub.dev/mock/aiko-avatar.png',
    physicalCharacteristics: 'Chromed limbs with holographic tattoos shimmering across her arms.',
    personality: 'Calculated strategist with a dry wit and a soft spot for soft jazz clubs.',
    history: 'Former corporate infiltrator who escaped the syndicate and now helps underground resistance cells.',
    isPublic: true,
    purpose: 'chat',
    originalLanguageCode: 'en',
    ageRating: 'FOURTEEN',
    contentTags: ['VIOLENCE', 'CRIME'],
    userId: 'user-demo-1',
    loraId: null,
    mainAttireId: null,
    createdAt: new Date('2024-10-10T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-10-21T11:32:00Z').toISOString(),
    lora: null,
    mainAttire: null,
    attires: [],
    tags: [
      {
        id: 'tag-cyberpunk',
        name: 'Cyberpunk',
        type: 'CHARACTER',
        weight: 5,
        ageRating: 'FOURTEEN',
        originalLanguageCode: 'en',
        createdAt: new Date('2024-09-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-09-01T00:00:00Z').toISOString()
      }
    ],
    stickers: []
  },
  {
    id: 'char-mock-002',
    firstName: 'Mateo',
    lastName: 'Silva',
    age: 28,
    gender: 'male',
    species: 'human',
    style: 'magical realism',
    avatar: 'https://images.charhub.dev/mock/mateo-avatar.png',
    physicalCharacteristics: 'Curly dark hair, ink-stained fingers, carries a luminescent quill.',
    personality: 'Empathetic narrator who pauses to collect impossible stories from strangers.',
    history: 'Grew up above a bookstore in São Paulo and can step inside his own manuscripts to rewrite memories.',
    isPublic: false,
    purpose: 'story',
    originalLanguageCode: 'pt',
    ageRating: 'TEN',
    contentTags: ['PSYCHOLOGICAL'],
    userId: 'user-demo-1',
    loraId: null,
    mainAttireId: null,
    createdAt: new Date('2024-09-18T15:20:00Z').toISOString(),
    updatedAt: new Date('2024-10-04T09:05:00Z').toISOString(),
    lora: null,
    mainAttire: null,
    attires: [],
    tags: [
      {
        id: 'tag-writer',
        name: 'Writer',
        type: 'CHARACTER',
        weight: 3,
        ageRating: 'TEN',
        originalLanguageCode: 'en',
        createdAt: new Date('2024-09-05T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-09-05T00:00:00Z').toISOString()
      }
    ],
    stickers: []
  }
];

const delay = (ms = 420) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

function buildCharacterFromPayload(payload: CharacterFormValues, id: string, userId: string): Character {
  const timestamp = new Date().toISOString();
  return {
    id,
    firstName: payload.firstName,
    lastName: payload.lastName ?? null,
    age: payload.age ?? null,
    gender: payload.gender ?? null,
    species: payload.species ?? null,
    style: payload.style ?? null,
    avatar: payload.avatar ?? null,
    physicalCharacteristics: payload.physicalCharacteristics ?? null,
    personality: payload.personality ?? null,
    history: payload.history ?? null,
    isPublic: payload.isPublic ?? false,
    purpose: payload.purpose ?? 'chat',
    originalLanguageCode: payload.originalLanguageCode ?? 'en',
    ageRating: payload.ageRating,
    contentTags: payload.contentTags,
    userId,
    loraId: payload.loraId ?? null,
    mainAttireId: payload.mainAttireId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    lora: null,
    mainAttire: null,
    attires: [],
    tags: [],
    stickers: payload.stickers ?? []
  };
}

async function listFromApi(params?: CharacterListParams): Promise<CharacterListResponse> {
  // Backend returns { success: boolean, data: Character[], count: number }
  const response = await api.get<{ success: boolean; data: Character[]; count: number }>(BASE_PATH, { params });

  // Transform backend response to CharacterListResponse format
  return {
    items: response.data.data || [],
    total: response.data.count || 0,
    page: 1,
    pageSize: response.data.data?.length || 20
  };
}

async function listWithMock(params?: CharacterListParams): Promise<CharacterListResponse> {
  await delay();
  let items = [...mockCharacters];

  if (params?.search) {
    const normalizedSearch = params.search.toLowerCase();
    items = items.filter(character => {
      const fullName = `${character.firstName} ${character.lastName ?? ''}`.toLowerCase();
      const matchesName = fullName.includes(normalizedSearch);
      const matchesStyle = character.style?.toLowerCase().includes(normalizedSearch);
      return matchesName || matchesStyle;
    });
  }

  if (params?.ageRatings?.length) {
    const allowed = new Set(params.ageRatings);
    items = items.filter(character => allowed.has(character.ageRating));
  }

  if (params?.contentTags?.length) {
    const requiredTags = new Set(params.contentTags);
    items = items.filter(character => character.contentTags.some(tag => requiredTags.has(tag)));
  }

  if (params?.isPublic != null) {
    items = items.filter(character => character.isPublic === params.isPublic);
  }

  if (params?.gender && params.gender !== 'all') {
    items = items.filter(character => character.gender === params.gender);
  }

  if (params?.sortBy) {
    const sort = params.sortBy;
    items.sort((a, b) => {
      if (sort === 'name') {
        return a.firstName.localeCompare(b.firstName);
      }

      const field = sort === 'createdAt' ? 'createdAt' : 'updatedAt';
      return new Date(b[field]).getTime() - new Date(a[field]).getTime();
    });
  }

  return defaultListResponse(items);
}

async function getByIdFromApi(characterId: string): Promise<Character> {
  // Backend returns { success: boolean, data: Character }
  const response = await api.get<{ success: boolean; data: Character }>(`${BASE_PATH}/${characterId}`);
  return response.data.data;
}

async function getByIdWithMock(characterId: string): Promise<Character> {
  await delay();
  const character = mockCharacters.find(item => item.id === characterId);
  if (!character) {
    throw new Error('Character not found');
  }
  return character;
}

async function createViaApi(payload: CharacterFormValues): Promise<CharacterMutationResult> {
  // Backend returns { success: boolean, data: Character }
  const response = await api.post<{ success: boolean; data: Character }>(BASE_PATH, payload);
  return { success: true, character: response.data.data };
}

async function createViaMock(payload: CharacterFormValues): Promise<CharacterMutationResult> {
  await delay();
  const id = `char-mock-${String(mockCharacters.length + 1).padStart(3, '0')}`;
  const userId = 'user-demo-1';
  const character = buildCharacterFromPayload(payload, id, userId);
  mockCharacters.push(character);
  return { success: true, character };
}

async function updateViaApi(characterId: string, payload: CharacterFormValues): Promise<CharacterMutationResult> {
  // Backend returns { success: boolean, data: Character }
  const response = await api.put<{ success: boolean; data: Character }>(`${BASE_PATH}/${characterId}`, payload);
  return { success: true, character: response.data.data };
}

async function updateViaMock(characterId: string, payload: CharacterFormValues): Promise<CharacterMutationResult> {
  await delay();
  const index = mockCharacters.findIndex(item => item.id === characterId);
  if (index === -1) {
    return { success: false, message: 'Character not found' };
  }

  const existing = mockCharacters[index];
  const updated: Character = {
    ...existing,
    ...buildCharacterFromPayload(payload, existing.id, existing.userId),
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  mockCharacters[index] = updated;
  return { success: true, character: updated };
}

async function deleteViaApi(characterId: string): Promise<CharacterMutationResult> {
  // Backend returns { success: boolean, message: string }
  const response = await api.delete<{ success: boolean; message: string }>(`${BASE_PATH}/${characterId}`);
  return { success: response.data.success, message: response.data.message };
}

async function deleteViaMock(characterId: string): Promise<CharacterMutationResult> {
  await delay();
  const index = mockCharacters.findIndex(item => item.id === characterId);
  if (index === -1) {
    return { success: false, message: 'Character not found' };
  }

  mockCharacters.splice(index, 1);
  return { success: true };
}

export const characterService = {
  async list(params?: CharacterListParams): Promise<CharacterListResponse> {
    if (USE_MOCKS) {
      return listWithMock(params);
    }

    try {
      return await listFromApi(params);
    } catch (error) {
      console.warn('[characterService] Falling back to mock list due to API error:', error);
      return listWithMock(params);
    }
  },
  async getById(characterId: string): Promise<Character> {
    if (USE_MOCKS) {
      return getByIdWithMock(characterId);
    }

    try {
      return await getByIdFromApi(characterId);
    } catch (error) {
      console.warn('[characterService] Falling back to mock detail due to API error:', error);
      return getByIdWithMock(characterId);
    }
  },
  async create(payload: CharacterFormValues = EMPTY_CHARACTER_FORM): Promise<CharacterMutationResult> {
    if (USE_MOCKS) {
      return createViaMock(payload);
    }

    try {
      return await createViaApi(payload);
    } catch (error) {
      console.error('[characterService] create failed:', error);
      return { success: false, message: 'characters:errors.createFailed' };
    }
  },
  async update(characterId: string, payload: CharacterFormValues): Promise<CharacterMutationResult> {
    if (USE_MOCKS) {
      return updateViaMock(characterId, payload);
    }

    try {
      return await updateViaApi(characterId, payload);
    } catch (error) {
      console.error('[characterService] update failed:', error);
      return { success: false, message: 'characters:errors.updateFailed' };
    }
  },
  async remove(characterId: string): Promise<CharacterMutationResult> {
    if (USE_MOCKS) {
      return deleteViaMock(characterId);
    }

    try {
      return await deleteViaApi(characterId);
    } catch (error) {
      console.error('[characterService] remove failed:', error);
      return { success: false, message: 'characters:errors.deleteFailed' };
    }
  }
};

export type CharacterService = typeof characterService;
