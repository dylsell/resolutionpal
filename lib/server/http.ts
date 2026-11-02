import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import type { QuotaStore } from './store';
import { getStore } from './store';
import { ServiceError } from './errors';

const COOKIE = 'rp_browser';
export type RequestContext = { store: QuotaStore; browser: string; ip: string; cookie?: string; hash: (value: string) => string };

function secret() {
  const value = process.env.RATE_LIMIT_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== 'production') return 'resolutionpal-development-only-secret-32';
  throw new ServiceError('CONFIGURATION_UNAVAILABLE', 'Plan generation is temporarily unavailable. Please try again later.');
}

function allowedOrigins() {
  const values = [process.env.APP_ORIGIN, process.env.RENDER_EXTERNAL_URL];
  if (process.env.NODE_ENV !== 'production') values.push('http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3007', 'http://127.0.0.1:3007');
  return values.filter((value): value is string => !!value).flatMap((value) => {
    try { return [new URL(value).origin]; } catch { return []; }
  });
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins().includes(origin)) throw new ServiceError('ORIGIN_NOT_ALLOWED', 'Please open Resolution Pal in your browser and try again.', 403);
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site') throw new ServiceError('ORIGIN_NOT_ALLOWED', 'Please open Resolution Pal in your browser and try again.', 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new ServiceError('INVALID_CONTENT_TYPE', 'Please send this request as JSON.', 415);
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>, maxBytes = 16_384): Promise<T> {
  const size = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(size) || size < 0 || size > maxBytes) throw new ServiceError('REQUEST_TOO_LARGE', 'Please shorten your answers and try again.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError('INVALID_REQUEST', 'Please complete the required fields and try again.', 400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ServiceError('REQUEST_TOO_LARGE', 'Please shorten your answers and try again.', 413);
      }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError('INVALID_REQUEST', 'Please complete the required fields and try again.', 400);
  } finally { reader.releaseLock(); }
}

export function createContext(request: Request): RequestContext {
  const key = secret();
  const hash = (value: string) => createHmac('sha256', key).update(value).digest('hex');
  const cookieValue = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  let browserId: string | undefined;
  if (cookieValue && cookieValue.length < 150) {
    const [id, signature] = cookieValue.split('.');
    if (/^[0-9a-f-]{36}$/i.test(id ?? '') && /^[0-9a-f]{64}$/.test(signature ?? '')) {
      const expected = hash(`cookie:${id}`);
      if (timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) browserId = id;
    }
  }
  let cookie: string | undefined;
  if (!browserId) {
    browserId = randomUUID();
    cookie = `${COOKIE}=${browserId}.${hash(`cookie:${browserId}`)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  }
  // Render's public ingress passes through Cloudflare, which overwrites CF-Connecting-IP.
  // Prefer that documented client address; never trust the caller-controlled leftmost XFF value.
  const onRender = process.env.RENDER === 'true';
  const cloudflare = onRender ? request.headers.get('cf-connecting-ip')?.trim() : undefined;
  const forwarded = onRender ? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() : undefined;
  const ip = cloudflare && isIP(cloudflare) ? cloudflare : forwarded && isIP(forwarded) ? forwarded : 'unavailable';
  return { store: getStore(), browser: hash(`browser:${browserId}`), ip: hash(`ip:${ip}`), cookie, hash };
}

export function json(body: unknown, status = 200, context?: RequestContext, retryAfter?: number) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store',
    ...(context?.cookie ? { 'Set-Cookie': context.cookie } : {}),
    ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
  } });
}

export function apiError(error: unknown, context?: RequestContext) {
  const safe = error instanceof ServiceError ? error : new ServiceError('TEMPORARILY_UNAVAILABLE', 'Something went wrong while making your plan. Your answers are saved in this browser. Please try again.');
  return json({ error: safe.message, code: safe.code, ...(safe.retryAfter ? { retryAfter: safe.retryAfter } : {}) }, safe.status, context, safe.retryAfter);
}

export function configurationReady() {
  return Boolean(process.env.OPENAI_API_KEY && (process.env.NODE_ENV !== 'production' || ((process.env.RATE_LIMIT_SECRET?.length ?? 0) >= 32 && process.env.APP_ORIGIN && allowedOrigins().length)));
}
