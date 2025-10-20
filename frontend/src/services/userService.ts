import api from '../lib/api';
import type { AuthUser } from '../types/auth';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const PROFILE_ENDPOINT = API_PREFIX + '/users/me';
const AVATAR_ENDPOINT = PROFILE_ENDPOINT + '/avatar';

export type UpdateProfilePayload = Partial<AuthUser>;

export async function fetchProfile(): Promise<AuthUser> {
  const response = await api.get<{ success: boolean; data: AuthUser }>(PROFILE_ENDPOINT);
  return response.data.data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const response = await api.patch<{ success: boolean; data: AuthUser }>(PROFILE_ENDPOINT, payload);
  return response.data.data;
}

export async function uploadAvatar(file: File): Promise<AuthUser> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await api.post<{ success: boolean; data: AuthUser }>(AVATAR_ENDPOINT, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
  const response = await api.get<{ success: boolean; available: boolean }>(`${PROFILE_ENDPOINT.replace('/me', '')}/check-username/${encodeURIComponent(username)}`);
  return { available: response.data.available };
}

export const userService = {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  checkUsernameAvailability,
};

export type UserService = typeof userService;
