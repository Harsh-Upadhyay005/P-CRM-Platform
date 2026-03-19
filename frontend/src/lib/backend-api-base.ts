const DEFAULT_BACKEND_ORIGIN = 'http://localhost:5000';
const ABSOLUTE_HTTP_URL_RE = /^https?:\/\//i;

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const ensureApiV1Path = (value: string) => {
  const normalized = trimTrailingSlashes(value);
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
};

/**
 * Resolve an absolute backend API base URL for server-side Route Handlers.
 * Prefer BACKEND_URL and fall back to an absolute NEXT_PUBLIC_API_URL when provided.
 */
export function getBackendApiBaseUrl(): string {
  const backendUrl = process.env.BACKEND_URL?.trim();
  if (backendUrl && ABSOLUTE_HTTP_URL_RE.test(backendUrl)) {
    return ensureApiV1Path(backendUrl);
  }

  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApiUrl && ABSOLUTE_HTTP_URL_RE.test(publicApiUrl)) {
    return ensureApiV1Path(publicApiUrl);
  }

  return `${DEFAULT_BACKEND_ORIGIN}/api/v1`;
}