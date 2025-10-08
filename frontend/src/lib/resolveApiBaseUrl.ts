const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function normalizeUrl(url: URL): string {
  return url.href.replace(/\/$/, '');
}

export function resolveApiBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  const hasWindow = typeof window !== 'undefined';

  if (!hasWindow) {
    return raw && raw.length > 0 ? raw : undefined;
  }

  if (!raw || raw.length === 0) {
    return window.location.origin;
  }

  try {
    const resolved = new URL(raw, window.location.origin);
    const currentHost = window.location.hostname;
    const configuredHost = resolved.hostname;
    const currentIsLocal = LOCAL_HOSTNAMES.has(currentHost);
    const configuredIsLocal = LOCAL_HOSTNAMES.has(configuredHost);

    if (!currentIsLocal && configuredIsLocal) {
      return window.location.origin;
    }

    return normalizeUrl(resolved);
  } catch (error) {
    console.warn('[api] failed to parse VITE_API_BASE_URL, falling back to raw value', error);
    return raw;
  }
}

