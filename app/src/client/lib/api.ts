interface ApiErrorShape {
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const hasJsonBody = options.body !== undefined && !headers.has('Content-Type');
  if (hasJsonBody) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error?: ApiErrorShape }).error
        : undefined;

    throw new ApiError(
      errorPayload?.message ?? `Request failed with status ${response.status}`,
      errorPayload?.code ?? 'REQUEST_FAILED',
      response.status,
    );
  }

  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new ApiError('Response payload is missing `data`.', 'INVALID_RESPONSE', response.status);
  }

  return (payload as { data: T }).data;
}
