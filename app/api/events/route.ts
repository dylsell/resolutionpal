import { eventSchema } from '@/lib/schemas';
import { apiError, checkOrigin, createContext, json, readJson, type RequestContext } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let context: RequestContext | undefined;
  try {
    checkOrigin(request);
    const body = await readJson(request, eventSchema, 1024);
    context = createContext(request);
    context.store.publicEvent(body.event, body.campaign ?? 'direct', context);
    return json({ ok: true }, 200, context);
  } catch (error) { return apiError(error, context); }
}
