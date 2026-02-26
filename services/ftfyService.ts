import { getAuthHeaders, API_BASE } from './apiClient';

export async function fixTextEncoding(text: string): Promise<{ original: string; fixed: string }> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ftfy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('ftfy failed');
  return res.json();
}
