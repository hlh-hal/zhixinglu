import { supabase } from './supabaseClient';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const defaultOptions: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(endpoint, defaultOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || response.statusText) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
