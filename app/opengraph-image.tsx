import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Meet your Resolution Pal — a little encouragement, a plan for real life, and a very good hat';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const pal = await readFile(join(process.cwd(), 'public/pal.png'), 'base64');
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', background: '#fff9ee', color: '#29263f', display: 'flex', padding: '54px 64px', fontFamily: 'sans-serif', position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 650 }}>
        <div style={{ display: 'flex', fontSize: 31, fontWeight: 700, color: '#b93648' }}>resolutionpal.</div>
        <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.04, letterSpacing: -4, marginTop: 42, maxWidth: 620 }}>Big hopes. A doable plan. A Pal by your side.</div>
        <div style={{ display: 'flex', marginTop: 27, fontSize: 24, color: '#656171', maxWidth: 570 }}>A resolution that fits your real life.</div>
        <div style={{ display: 'flex', marginTop: 'auto', gap: 12, fontSize: 19 }}>
          <span style={{ padding: '12px 20px', background: '#d6c2ff', borderRadius: 30 }}>Your first week + next 90 days</span>
          <span style={{ padding: '12px 20px', background: '#cdebdc', borderRadius: 30 }}>Free · No signup</span>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 42, top: 83, width: 370, height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: '#ffd05a', top: 85, right: 0, display: 'flex' }} />
        <img src={`data:image/png;base64,${pal}`} alt="" width={410} height={410} style={{ position: 'relative', objectFit: 'contain' }} />
        <span style={{ position: 'absolute', bottom: -8, right: 5, background: '#d6c2ff', padding: '14px 25px', borderRadius: 30, fontSize: 21, transform: 'rotate(-5deg)' }}>Small steps. Big hat.</span>
      </div>
    </div>, size,
  );
}
