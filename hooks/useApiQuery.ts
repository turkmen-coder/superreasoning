/**
 * Generic API query hook — loading/error/data state yönetimini merkezileştirir.
 * 21 bileşende tekrarlanan fetch boilerplate'ini elimine eder.
 */

import { useState, useCallback, useEffect } from 'react';
import { API_BASE, getAuthHeaders } from '../services/apiClient';

export interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

interface UseApiQueryOptions {
  /** İlk mount'ta otomatik fetch yapılsın mı? (default: true) */
  immediate?: boolean;
  /** Sonuçtan veri çıkarmak için custom extractor */
  extract?: (json: Record<string, unknown>) => unknown;
}

/**
 * API endpoint'inden veri çeker, loading/error state'ini yönetir.
 *
 * @param endpoint - API yolu (e.g. '/prompts', '/regression/runs')
 * @param deps - useEffect dependency array (refetch tetikleyicileri)
 * @param options - immediate, extract
 */
export function useApiQuery<T>(
  endpoint: string,
  deps: unknown[] = [],
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const { immediate = true, extract } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, { headers });
      if (res.ok) {
        const json = await res.json();
        const result = extract ? extract(json) : json;
        setData(result as T);
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as Record<string, string>).error || `Error ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, ...deps]);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
  }, [refetch, immediate]);

  return { data, loading, error, refetch };
}

export interface UseApiMutationResult<TBody, TResult> {
  mutate: (body: TBody) => Promise<TResult | null>;
  loading: boolean;
  error: string;
}

/**
 * API POST/PUT/DELETE mutation hook.
 *
 * @param endpoint - API yolu
 * @param method - HTTP method (default: 'POST')
 */
export function useApiMutation<TBody, TResult = unknown>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
): UseApiMutationResult<TBody, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mutate = useCallback(async (body: TBody): Promise<TResult | null> => {
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as Record<string, string>).error || `Error ${res.status}`);
        return null;
      }
      return json as TResult;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, method]);

  return { mutate, loading, error };
}
