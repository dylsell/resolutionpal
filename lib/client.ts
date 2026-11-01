import type { ApiError, FunnelEvent } from './types';

export class RequestError extends Error {
  constructor(message: string, public code: string, public retryAfter?: number) { super(message); }
}
export async function postApi<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = window.setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    let data: T & Partial<ApiError>;
    try { data = await response.json(); } catch { throw new RequestError('We couldn’t read the response. Your answers are safe here; please try again.', 'INVALID_RESPONSE'); }
    if (!response.ok) throw new RequestError(data.error || 'Something interrupted your plan. Please try again.', data.code || 'REQUEST_FAILED', data.retryAfter);
    return data;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (signal?.aborted) throw new RequestError('Request cancelled.', 'CANCELLED');
    if (error instanceof DOMException && error.name === 'AbortError') throw new RequestError('That took longer than expected. Your answers are saved here. Please try again in a moment.', 'TIMEOUT');
    throw new RequestError('We couldn’t connect. Check your internet connection, then try again. Your answers are still here.', 'NETWORK');
  } finally { window.clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}
export function track(event: FunnelEvent) {
  try {
    const query = new URLSearchParams(window.location.search);
    const candidate = query.get('utm_campaign');
    if (candidate && ['linkedin-launch', 'personal-site', 'direct'].includes(candidate)) sessionStorage.setItem('resolutionpal.campaign', candidate);
    const campaign = sessionStorage.getItem('resolutionpal.campaign') || 'direct';
    void fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, campaign }), keepalive: true }).catch(() => {});
  } catch { /* Analytics never blocks a plan. */ }
}
