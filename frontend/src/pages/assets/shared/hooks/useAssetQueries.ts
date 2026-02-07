import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { assetService } from '../../../../services/assetService';
import {
  type Asset,
  type AssetFormValues,
  type AssetListParams,
  type AssetListResponse,
  type AssetMutationResult,
  type CharacterAsset,
  type LinkAssetToCharacterParams,
  type UpdateCharacterAssetParams
} from '../../../../types/assets';

const listQueryKey = (filters: AssetListParams | undefined) => ['assets', 'list', filters ?? {}];
const detailQueryKey = (assetId: string) => ['assets', 'detail', assetId];
const characterAssetsQueryKey = (characterId: string) => ['assets', 'character', characterId];

type AssetListQueryOptions = Omit<UseQueryOptions<AssetListResponse, Error, AssetListResponse>, 'queryKey' | 'queryFn'>;
type AssetDetailQueryOptions = Omit<UseQueryOptions<Asset, Error, Asset>, 'queryKey' | 'queryFn'>;
type CharacterAssetsQueryOptions = Omit<UseQueryOptions<CharacterAsset[], Error, CharacterAsset[]>, 'queryKey' | 'queryFn'>;

/**
 * Query hook for fetching asset list
 */
export function useAssetListQuery(
  filters?: AssetListParams,
  options?: AssetListQueryOptions
) {
  return useQuery<AssetListResponse, Error>({
    queryKey: listQueryKey(filters),
    queryFn: () => assetService.list(filters),
    staleTime: 0, // Always refetch when filters change
    ...options
  });
}

/**
 * Query hook for fetching single asset
 */
export function useAssetDetailQuery(
  assetId: string,
  options?: AssetDetailQueryOptions
) {
  return useQuery<Asset, Error>({
    queryKey: detailQueryKey(assetId),
    queryFn: () => assetService.getById(assetId),
    enabled: Boolean(assetId),
    staleTime: 1000 * 60,
    ...options
  });
}

/**
 * Query hook for fetching assets linked to a character
 */
export function useCharacterAssetsQuery(
  characterId: string,
  options?: CharacterAssetsQueryOptions
) {
  return useQuery<CharacterAsset[], Error>({
    queryKey: characterAssetsQueryKey(characterId),
    queryFn: () => assetService.getCharacterAssets(characterId),
    enabled: Boolean(characterId),
    staleTime: 1000 * 30,
    ...options
  });
}

/**
 * Mutation hooks for asset operations
 */
export function useAssetMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation<AssetMutationResult, Error, AssetFormValues>({
    mutationFn: async payload => {
      const result = await assetService.create(payload);
      if (!result.success) {
        throw new Error(result.message ?? 'assets:errors.createFailed');
      }
      return result;
    },
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'list'] });
      if (result.asset) {
        queryClient.setQueryData(detailQueryKey(result.asset.id), result.asset);
      }
    }
  });

  const updateMutation = useMutation<AssetMutationResult, Error, { assetId: string; payload: AssetFormValues }>({
    mutationFn: async ({ assetId, payload }) => {
      const result = await assetService.update(assetId, payload);
      if (!result.success) {
        throw new Error(result.message ?? 'assets:errors.updateFailed');
      }
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'list'] });
      if (result.asset) {
        queryClient.setQueryData(detailQueryKey(variables.assetId), result.asset);
      }
    }
  });

  const deleteMutation = useMutation<AssetMutationResult, Error, string>({
    mutationFn: async assetId => {
      const result = await assetService.remove(assetId);
      if (!result.success) {
        throw new Error(result.message ?? 'assets:errors.deleteFailed');
      }
      return result;
    },
    onSuccess: (_result, assetId) => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'list'] });
      queryClient.removeQueries({ queryKey: detailQueryKey(assetId) });
    }
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation
  };
}

/**
 * Mutation hooks for character-asset linking operations
 */
export function useCharacterAssetMutations() {
  const queryClient = useQueryClient();

  const linkMutation = useMutation<
    { success: boolean; data?: CharacterAsset },
    Error,
    LinkAssetToCharacterParams
  >({
    mutationFn: async params => {
      const result = await assetService.linkToCharacter(params);
      if (!result.success) {
        throw new Error('assets:errors.linkFailed');
      }
      return result;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'character', variables.characterId] });
    }
  });

  const unlinkMutation = useMutation<{ success: boolean }, Error, { characterAssetId: string; characterId: string }>({
    mutationFn: async ({ characterAssetId }) => {
      const result = await assetService.unlinkFromCharacter(characterAssetId);
      if (!result.success) {
        throw new Error('assets:errors.unlinkFailed');
      }
      return result;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'character', variables.characterId] });
    }
  });

  const updateMutation = useMutation<
    { success: boolean; data?: CharacterAsset },
    Error,
    { characterAssetId: string; params: UpdateCharacterAssetParams }
  >({
    mutationFn: async ({ characterAssetId, params }) => {
      const result = await assetService.updateCharacterAsset(characterAssetId, params);
      if (!result.success) {
        throw new Error('assets:errors.updateLinkFailed');
      }
      return result;
    },
    onSuccess: (_result, variables) => {
      // Invalidate character assets queries
      queryClient.invalidateQueries({ queryKey: ['assets', 'character'] });
    }
  });

  return {
    linkMutation,
    unlinkMutation,
    updateMutation
  };
}
