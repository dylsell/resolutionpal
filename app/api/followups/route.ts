import { followupRequestSchema } from '@/lib/schemas';
import { makeFollowups } from '@/lib/server/ai';
import { apiError, checkOrigin, createContext, json, readJson, type RequestContext } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  let context: RequestContext | undefined;
  let requestKey: string | undefined;
  try {
    checkOrigin(request);
    const body = await readJson(request, followupRequestSchema);
    context = createContext(request);
    const key = context.hash(`request:${body.requestId}`);
    context.store.beginRequest(key, 'followups', context);
    requestKey = key;
    const result = await makeFollowups(body.intake, context.store);
    context.store.finishRequest(requestKey, 'completed');
    return json(result, 200, context);
  } catch (error) {
    if (context && requestKey) { try { context.store.finishRequest(requestKey, 'failed'); } catch { /* Fail closed without logging personal data. */ } }
    return apiError(error, context);
  }
}
