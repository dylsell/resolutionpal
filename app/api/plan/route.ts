import { planRequestSchema } from '@/lib/schemas';
import { makePlan } from '@/lib/server/ai';
import { apiError, checkOrigin, createContext, json, readJson, type RequestContext } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  let context: RequestContext | undefined;
  let requestKey: string | undefined;
  try {
    checkOrigin(request);
    const body = await readJson(request, planRequestSchema);
    context = createContext(request);
    const key = context.hash(`request:${body.requestId}`);
    context.store.beginRequest(key, 'plan', context);
    requestKey = key;
    const plan = await makePlan({ intake: body.intake, followups: body.followups }, context.store);
    context.store.finishRequest(requestKey, 'completed');
    return json({ plan }, 200, context);
  } catch (error) {
    if (context && requestKey) { try { context.store.finishRequest(requestKey, 'failed'); } catch { /* Fail closed without logging personal data. */ } }
    return apiError(error, context);
  }
}
