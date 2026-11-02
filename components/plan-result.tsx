'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useJourney } from '@/lib/journey';
import { addDays, formatDate } from '@/lib/dates';
import { planAsText } from '@/lib/export';
import { track } from '@/lib/client';
import { Header, Footer } from './header';
import { Arrow, Check, Clock, Heart, Leaf, Spark } from './icons';

export default function PlanResult() {
  const { journey, clear, storageWarning } = useJourney();
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [manualCopy, setManualCopy] = useState('');
  if (!journey) return <><Header minimal /><main id="main-content" className="loading-shell"><Image loading="eager" src="/pal.png" alt="" width={100} height={100} /><p>Opening your next chapter…</p></main></>;
  if (!journey.plan) return <><Header minimal /><main id="main-content" className="empty-state section-container"><div className="empty-icon"><Image loading="eager" src="/pal.png" alt="Pal, ready to help you make a plan" width={160} height={160} /></div><span className="eyebrow">THERE’S ROOM FOR A FRESH START</span><h1>Your plan starts<br />with your something.</h1><p>{journey.intake.goal ? 'Your draft is right where you left it. A few more thoughtful minutes, and you’ll have a way forward.' : 'A few questions about what matters, and a little room for what comes next.'}</p><Link href="/start" className="button button-primary">{journey.intake.goal ? 'Continue my plan' : 'Make my plan'} <Arrow /></Link></main><Footer /></>;
  const { plan, intake } = journey;
  async function copyPlan() {
    const text = planAsText(plan!, intake);
    try { await navigator.clipboard.writeText(text); setStatus('Your plan is copied. Put it somewhere you’ll see it.'); setManualCopy(''); track('copy'); }
    catch { setManualCopy(text); setStatus('Select and copy your plan below.'); }
  }
  function printPlan() { track('print'); window.print(); }
  async function shareTool() {
    const url = 'https://resolutionpal.com';
    try {
      if (navigator.share) { await navigator.share({ title: 'Resolution Pal', text: 'A resolution that fits your real life. Make a small, doable plan for something that matters.', url }); setStatus('A little encouragement, passed along.'); }
      else { await navigator.clipboard.writeText(url); setStatus('The Resolution Pal link is copied. Your personal plan stays private.'); }
      track('share');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setManualCopy(url); setStatus('Copy this link to share Resolution Pal. Your answers aren’t included.');
    }
  }
  function clearPlan() {
    if (window.confirm('Clear this plan and all its answers from this browser? Copy or print it first if you’d like to keep it.')) { clear(); track('clear'); router.push('/start'); }
  }
  return <><Header minimal /><main id="main-content" className="result-page section-container">
    <div className="result-topbar no-print"><span className="saved-label"><span className="status-dot" />{storageWarning ? 'Keep this tab open' : 'Your plan is saved in this browser'}</span><Link href="/start?edit=1" className="text-button">Edit my answers <span aria-hidden="true">↗</span></Link></div>
    {storageWarning && <div className="notice storage-notice no-print" role="status">{storageWarning}</div>}
    <header className="result-heading"><Image loading="eager" className="result-pal no-print" src="/pal.png" alt="Your Pal, with a plan just for you" width={110} height={110} /><div className="eyebrow"><Spark size={18} /> A LITTLE INTENTION, A REAL WAY FORWARD</div><h1>{plan.title}</h1><p>{plan.resolution}</p><div className="plan-meta"><span><Clock size={17} />{intake.minutesPerWeek} minutes a week</span><span><span aria-hidden="true">↗</span> Starting {formatDate(intake.startDate)}</span></div><div className="result-actions no-print"><button className="button button-primary" type="button" onClick={copyPlan}><CopyIcon />Copy my plan</button><button className="button button-outline" type="button" onClick={printPlan}><PrintIcon />Print / save PDF</button></div><p className="print-brand">Made with Resolution Pal · resolutionpal.com</p></header>
    <div className="result-status no-print" role="status" aria-live="polite">{status}</div>
    {manualCopy && <div className="manual-copy no-print"><label htmlFor="manual-copy">Select and copy</label><textarea id="manual-copy" value={manualCopy} readOnly rows={6} onFocus={e => e.target.select()} /><button className="text-button" type="button" onClick={() => setManualCopy('')}>Close</button></div>}
    <div className="meaning-grid"><section className="meaning-card"><span className="eyebrow"><Heart size={17} /> YOUR REASON TO COME BACK</span><h2>Why this matters.</h2><p>{plan.why}</p></section><section className="meaning-card meaning-success"><span className="eyebrow"><Spark size={17} /> SOMETHING TO WORK TOWARD</span><h2>Your version of progress.</h2><p>{plan.successMeasure}</p></section></div>
    <section className="first-week-section"><div className="result-section-heading"><div><span className="eyebrow">01 / SMALL ENOUGH TO START</span><h2>Your first week.</h2></div><span className="section-date">{formatDate(intake.startDate, true)} – {formatDate(addDays(intake.startDate, 6), true)}</span></div><div className="first-week-grid">{plan.firstWeek.map((action, i) => <article key={`${action.title}-${i}`} className="action-card"><div className="action-card-top"><span className="action-number">0{i + 1}</span><span className="time-badge"><Clock size={13} />{action.minutes} min</span></div><h3>{action.title}</h3><p>{action.detail}</p><span className="action-small-check"><Check size={15} /> A little step forward</span></article>)}</div></section>
    <section className="rhythm-section"><div className="rhythm-main"><span className="eyebrow">02 / A LITTLE CONSISTENCY</span><h2>Find your rhythm.</h2><p className="section-intro">A repeatable routine you can make your own.</p><div className="routine-list">{plan.weeklyRoutine.map((routine, i) => <article key={`${routine.action}-${i}`}><span className="routine-symbol"><Leaf size={20} /></span><div><h3>{routine.action}</h3><p>{routine.frequency}</p></div><span className="routine-time">{routine.minutesPerWeek}<small>min / week</small></span></article>)}</div></div><aside className="kindness-card"><Heart size={26} /><span className="eyebrow">FOR THE WEEKS LIFE HAPPENS</span><h3>Smaller still counts.</h3><p>{plan.minimumVersion}</p><div className="kindness-rule" /><strong>When something gets in the way</strong><p>{plan.obstaclePlan}</p><span className="handwritten">You’re allowed to begin again.</span></aside></section>
    <section className="milestones-section"><div className="result-section-heading"><div><span className="eyebrow">03 / LOOK A LITTLE FURTHER</span><h2>Your next 90 days.</h2></div><p>Direction, with room to adjust.</p></div><div className="milestone-grid">{plan.milestones.map((milestone, i) => <article className="milestone-card" key={milestone.day}><div className="milestone-marker"><span>{i === 2 ? <Spark size={21} /> : <Leaf size={20} />}</span><div className="milestone-line" /></div><span className="eyebrow">DAY {milestone.day} · {formatDate(addDays(intake.startDate, milestone.day), true)}</span><h3>{milestone.title}</h3><p>{milestone.detail}</p></article>)}</div></section>
    <section className="reflection-section"><span className="eyebrow">A QUESTION TO KEEP CLOSE</span><h2>“{plan.reflection.replace(/^['“]|['”]$/g, '')}”</h2><p>Come back to this when you’re ready to check in with yourself.</p></section>
    <section className="encouragement"><Image src="/pal.png" width={86} height={86} alt="Pal, your little planning companion" /><div><span className="eyebrow">A LITTLE NOTE FROM YOUR PAL</span><p>{plan.encouragement}</p></div></section>
    <div className="result-footer-actions no-print"><div><h2>Keep your next step close.</h2><p>Copy it into your notes, print it for your desk, or come back here.</p></div><div><button className="button button-primary" type="button" onClick={copyPlan}><CopyIcon />Copy my plan</button><button className="button button-outline" type="button" onClick={printPlan}><PrintIcon />Print / save PDF</button></div></div>
    <div className="result-smallprint no-print"><p>Made with AI, using your answers. Make the plan your own as you go. Your saved plan lives in this browser; clearing browser data will remove it.</p><div><button className="text-button" type="button" onClick={shareTool}>Share Resolution Pal <Arrow size={15} /></button><button className="text-button" type="button" onClick={clearPlan}>Clear my plan</button></div></div>
  </main><Footer /></>;
}
function CopyIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></svg>; }
function PrintIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6zM18 12h.01" /></svg>; }
