import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { sceneService } from '../../../../services/sceneService';
import {
  type Scene,
  type SceneFormValues,
  type SceneArea,
  type SceneAreaFormValues,
  type SceneListParams,
  type SceneListResponse,
  type SceneMutationResult,
} from '../../../../types/scenes';

const listQueryKey = (filters: SceneListParams | undefined) => ['scenes', 'list', filters ?? {}];
const detailQueryKey = (sceneId: string) => ['scenes', 'detail', sceneId];
const areasQueryKey = (sceneId: string) => ['scenes', 'areas', sceneId];
const areaDetailQueryKey = (areaId: string) => ['scenes', 'area', areaId];

type SceneListQueryOptions = Omit<UseQueryOptions<SceneListResponse, Error, SceneListResponse>, 'queryKey' | 'queryFn'>;
type SceneDetailQueryOptions = Omit<UseQueryOptions<Scene, Error, Scene>, 'queryKey' | 'queryFn'>;
type SceneAreasQueryOptions = Omit<UseQueryOptions<SceneArea[], Error, SceneArea[]>, 'queryKey' | 'queryFn'>;
type AreaDetailQueryOptions = Omit<UseQueryOptions<SceneArea, Error, SceneArea>, 'queryKey' | 'queryFn'>;

/**
 * Query for listing scenes with filters
 */
export function useSceneListQuery(filters?: SceneListParams, options?: SceneListQueryOptions) {
  return useQuery<SceneListResponse, Error>({
    queryKey: listQueryKey(filters),
    queryFn: () => sceneService.list(filters),
    staleTime: 1000 * 30,
    ...options
  });
}

/**
 * Query for getting scene details
 */
export function useSceneDetailQuery(sceneId: string, options?: SceneDetailQueryOptions) {
  return useQuery<Scene, Error>({
    queryKey: detailQueryKey(sceneId),
    queryFn: () => sceneService.getById(sceneId),
    enabled: Boolean(sceneId),
    ...options
  });
}

/**
 * Query for getting scene areas
 */
export function useSceneAreasQuery(sceneId: string, options?: SceneAreasQueryOptions) {
  return useQuery<SceneArea[], Error>({
    queryKey: areasQueryKey(sceneId),
    queryFn: () => sceneService.getSceneAreas(sceneId),
    enabled: Boolean(sceneId),
    ...options
  });
}

/**
 * Query for getting area details
 */
export function useAreaDetailQuery(areaId: string, options?: AreaDetailQueryOptions) {
  return useQuery<SceneArea, Error>({
    queryKey: areaDetailQueryKey(areaId),
    queryFn: () => sceneService.getAreaById(areaId),
    enabled: Boolean(areaId),
    ...options
  });
}

/**
 * Mutations for scene CRUD operations
 */
export function useSceneMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation<SceneMutationResult, Error, SceneFormValues>({
    mutationFn: async payload => {
      const result = await sceneService.create(payload);
      if (!result.success) {
        throw new Error(result.message ?? 'scenes:errors.createFailed');
      }
      return result;
    },
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['scenes', 'list'] });
      if (result.scene) {
        queryClient.setQueryData(detailQueryKey(result.scene.id), result.scene);
      }
    }
  });

  const updateMutation = useMutation<
    SceneMutationResult,
    Error,
    { sceneId: string; payload: SceneFormValues }
  >({
    mutationFn: async ({ sceneId, payload }) => {
      const result = await sceneService.update(sceneId, payload);
      if (!result.success) {
        throw new Error(result.message ?? 'scenes:errors.updateFailed');
      }
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', 'list'] });
      if (result.scene) {
        queryClient.setQueryData(detailQueryKey(variables.sceneId), result.scene);
      }
    }
  });

  const deleteMutation = useMutation<SceneMutationResult, Error, string>({
    mutationFn: async sceneId => {
      const result = await sceneService.remove(sceneId);
      if (!result.success) {
        throw new Error(result.message ?? 'scenes:errors.deleteFailed');
      }
      return result;
    },
    onSuccess: (_result, sceneId) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', 'list'] });
      queryClient.removeQueries({ queryKey: detailQueryKey(sceneId) });
    }
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}

/**
 * Mutations for area operations
 */
export function useAreaMutations(sceneId: string) {
  const queryClient = useQueryClient();

  const addAreaMutation = useMutation<
    SceneArea,
    Error,
    SceneAreaFormValues
  >({
    mutationFn: async payload => {
      return await sceneService.addArea(sceneId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areasQueryKey(sceneId) });
      queryClient.invalidateQueries({ queryKey: detailQueryKey(sceneId) });
    }
  });

  const updateAreaMutation = useMutation<
    SceneArea,
    Error,
    { areaId: string; payload: SceneAreaFormValues }
  >({
    mutationFn: async ({ areaId, payload }) => {
      return await sceneService.updateArea(areaId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areasQueryKey(sceneId) });
      queryClient.invalidateQueries({ queryKey: detailQueryKey(sceneId) });
    }
  });

  const deleteAreaMutation = useMutation<
    { success: boolean; message: string },
    Error,
    string
  >({
    mutationFn: async areaId => {
      return await sceneService.removeArea(areaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areasQueryKey(sceneId) });
      queryClient.invalidateQueries({ queryKey: detailQueryKey(sceneId) });
    }
  });

  return {
    addAreaMutation,
    updateAreaMutation,
    deleteAreaMutation,
  };
}
