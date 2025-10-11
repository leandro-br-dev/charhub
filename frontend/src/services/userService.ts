import api from '../lib/api';
import type { AuthUser } from '../types/auth';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const PROFILE_ENDPOINT = API_PREFIX + '/users/me';

export interface UpdateProfilePayload {
  displayName: string;
  fullName?: string | null;
  birthDate?: string | null;
  gender?: string;
}

export async function fetchProfile(): Promise<AuthUser> {
  const response = await api.get<{ success: boolean; data: AuthUser }>(PROFILE_ENDPOINT);
  return response.data.data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const response = await api.patch<{ success: boolean; data: AuthUser }>(PROFILE_ENDPOINT, payload);
  return response.data.data;
}

export const userService = {
  fetchProfile,
  updateProfile
};

export type UserService = typeof userService;
