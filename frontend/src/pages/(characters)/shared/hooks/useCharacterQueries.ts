import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { characterService } from '../../../../services/characterService';
import {
  type Character,
  type CharacterFormValues,
  type CharacterListParams,
  type CharacterListResponse,
  type CharacterMutationResult
} from '../../../../types/characters';

const listQueryKey = (filters: CharacterListParams | undefined) => ['characters', 'list', filters ?? {}];
const detailQueryKey = (characterId: string) => ['characters', 'detail', characterId];

type CharacterListQueryOptions = Omit<UseQueryOptions<CharacterListResponse, Error, CharacterListResponse>, 'queryKey' | 'queryFn'>;
type CharacterDetailQueryOptions = Omit<UseQueryOptions<Character, Error, Character>, 'queryKey' | 'queryFn'>;

export function useCharacterListQuery(
  filters?: CharacterListParams,
  options?: CharacterListQueryOptions
) {
  return useQuery<CharacterListResponse, Error>({
    queryKey: listQueryKey(filters),
    queryFn: () => characterService.list(filters),
    staleTime: 1000 * 30,
    ...options
  });
}

export function useCharacterQuery(
  characterId: string,
  options?: CharacterDetailQueryOptions
) {
  return useQuery<Character, Error>({
    queryKey: detailQueryKey(characterId),
    queryFn: () => characterService.getById(characterId),
    enabled: Boolean(characterId),
    ...options
  });
}

export function useCharacterMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation<CharacterMutationResult, Error, CharacterFormValues>({
    mutationFn: async payload => {
      const result = await characterService.create(payload);
      if (!result.success) {
        throw new Error(result.message ?? 'characters:errors.createFailed');
      }
      return result;
    },
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['characters', 'list'] });
      if (result.character) {
        queryClient.setQueryData(detailQueryKey(result.character.id), result.character);
      }
    }
  });

  const updateMutation = useMutation<CharacterMutationResult, Error, { characterId: string; payload: CharacterFormValues }>({
    mutationFn: async ({ characterId, payload }) => {
      const result = await characterService.update(characterId, payload);
      if (!result.success) {
        throw new Error(result.message ?? 'characters:errors.updateFailed');
      }
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['characters', 'list'] });
      if (result.character) {
        queryClient.setQueryData(detailQueryKey(variables.characterId), result.character);
      }
    }
  });

  const deleteMutation = useMutation<CharacterMutationResult, Error, string>({
    mutationFn: async characterId => {
      const result = await characterService.remove(characterId);
      if (!result.success) {
        throw new Error(result.message ?? 'characters:errors.deleteFailed');
      }
      return result;
    },
    onSuccess: (_result, characterId) => {
      queryClient.invalidateQueries({ queryKey: ['characters', 'list'] });
      queryClient.removeQueries({ queryKey: detailQueryKey(characterId) });
    }
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation
  };
}
