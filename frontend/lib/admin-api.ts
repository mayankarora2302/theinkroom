'use client';

/**
 * Browser client for the admin API. Requests go to /api/v1/admin on this origin (proxied to
 * Express), carry the HTTP-only session cookie automatically, and send the CSRF token on writes.
 * No credentials are ever stored in localStorage.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;
export const setCsrfToken = (t: string | null) => {
  csrfToken = t;
};

export const UNAUTHENTICATED_EVENT = 'admin:unauthenticated';

const BASE = '/api/v1/admin';

async function parseBody<T>(res: Response): Promise<{ data: T; meta?: unknown }> {
  if (res.status === 204) return { data: undefined as T };
  const body = (await res.json().catch(() => null)) as { data?: T; meta?: unknown; error?: { code: string; message: string; fields?: Record<string, string> } } | null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'ERROR',
      body?.error?.message ?? (res.status >= 500 ? 'The server had a problem. Please try again.' : 'Something went wrong.'),
      body?.error?.fields ?? {},
    );
  }
  return { data: body?.data as T, meta: body?.meta };
}

const parse = async <T,>(res: Response): Promise<T> => (await parseBody<T>(res)).data;

export async function adminRequest<T>(path: string, init: { method?: string; json?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  return (await adminRequestFull<T>(path, init)).data;
}

/** Same as adminRequest but also returns list metadata (pagination). */
export async function adminRequestFull<T, M = unknown>(
  path: string,
  init: { method?: string; json?: unknown; signal?: AbortSignal } = {},
): Promise<{ data: T; meta?: M }> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (init.json !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['x-csrf-token'] = csrfToken;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: init.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your internet connection.');
  }
  return (await parseBody<T>(res)) as { data: T; meta?: M };
}

/** Multipart upload with progress (fetch cannot report upload progress). */
export function adminUpload<T>(path: string, method: 'POST' | 'PUT', form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${BASE}${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('accept', 'application/json');
    if (csrfToken) xhr.setRequestHeader('x-csrf-token', csrfToken);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      const res = new Response(xhr.status === 204 ? null : xhr.responseText, {
        status: xhr.status,
        headers: { 'content-type': 'application/json' },
      });
      parse<T>(res).then(resolve, reject);
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK', 'The upload was interrupted. Check your connection and try again.'));
    xhr.send(form);
  });
}
