import { configurationReady, json } from '@/lib/server/http';
import { getStore } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    getStore().ping();
    const ready = configurationReady();
    return json({ status: ready ? 'ready' : 'not_ready' }, ready ? 200 : 503);
  } catch { return json({ status: 'not_ready' }, 503); }
}
