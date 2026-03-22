import { supabase } from './supabaseClient';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type JsonBody = Record<string, unknown> | unknown[] | null;

interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  body?: JsonBody | FormData;
}

async function request<T>(method: ApiMethod, endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    headers: customHeaders,
    ...restOptions
  } = options;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(customHeaders ?? {});
  const isFormData = body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(endpoint, {
    ...restOptions,
    method,
    headers,
    body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const rawText = await response.text();
  const payload = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      response.statusText ||
      'Request failed';

    throw new ApiError(message, response.status, payload?.details);
  }

  return (payload ?? {}) as T;
}

export const get = <T>(endpoint: string, options?: Omit<RequestOptions, 'body'>) =>
  request<T>('GET', endpoint, options);

export const post = <T>(endpoint: string, body?: RequestOptions['body'], options?: Omit<RequestOptions, 'body'>) =>
  request<T>('POST', endpoint, { ...options, body });

export const put = <T>(endpoint: string, body?: RequestOptions['body'], options?: Omit<RequestOptions, 'body'>) =>
  request<T>('PUT', endpoint, { ...options, body });

export const del = <T>(endpoint: string, options?: Omit<RequestOptions, 'body'>) =>
  request<T>('DELETE', endpoint, options);

export const apiClient = {
  get,
  post,
  put,
  del,
};
