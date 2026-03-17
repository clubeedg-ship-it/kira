const API_BASE = '';

type ApiResponse<T> = { data: T };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const userId = localStorage.getItem('userId');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
};
