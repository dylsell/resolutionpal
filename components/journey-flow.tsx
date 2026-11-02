'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { FollowupQuestion, Intake, ResolutionPlan } from '@/lib/types';
import { useJourney } from '@/lib/journey';
import { formatDate, localDate, nextJanuaryFirst } from '@/lib/dates';
import { postApi, RequestError, track } from '@/lib/client';
import { Header } from './header';
import { Arrow, Check, Heart, Spark } from './icons';

const prompts = [
  { eyebrow: 'LET’S START WITH WHAT MATTERS', title: 'What’s your something?', description: 'A big ambition or a tiny shift. What would you like to make room for in your life?' },
  { eyebrow: 'GIVE IT A LITTLE MEANING', title: 'Why this, for you?', description: 'Forget what you should want. Let’s find the reason you’ll want to come back to.' },
  { eyebrow: 'LET’S MEET YOU WHERE YOU ARE', title: 'What does life look like now?', description: 'An honest starting point makes a much kinder plan. No judgment here.' },
  { eyebrow: 'SMALL ENOUGH TO START', title: 'Make a little room.', description: 'Choose the time you can really give this. You can always grow into more.' },
];
const phases = ['Find your thing', 'Make it fit', 'Your next steps'];
const examples = ['Read more, scroll less', 'Move my body more often', 'Make time for the people I love', 'Start a creative practice'];

export default function JourneyFlow() {
  const { journey, update, clear, storageWarning } = useJourney();
  const router = useRouter();
  const [editing, setEditing] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'questions' | 'plan' | null>(null);
  const [fallback, setFallback] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  useEffect(() => { setEditing(new URLSearchParams(window.location.search).has('edit')); return () => controller.current?.abort(); }, []);
  useEffect(() => { if (journey?.plan && editing === false) router.replace('/plan'); }, [journey?.plan, editing, router]);
  useEffect(() => { heading.current?.focus(); }, [journey?.step, busy]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);
  const go = useCallback((step: number) => { setError(''); update(j => ({ ...j, step })); }, [update]);
  function changeField<K extends keyof Intake>(key: K, value: Intake[K]) {
    setError(''); update(j => ({ ...j, intake: { ...j.intake, [key]: value }, questions: [], answers: {}, plan: null }));
  }
  function changeAnswer(id: string, answer: string) { setError(''); update(j => ({ ...j, answers: { ...j.answers, [id]: answer }, plan: null })); }
  if (!journey || editing === null || (journey.plan && !editing)) return <><Header minimal /><main className="loading-shell" id="main-content"><Image loading="eager" src="/pal.png" alt="" width={100} height={100} /><p>Finding your place…</p></main></>;
  const { intake, step, questions, answers } = journey;
  const question = questions[step - 4];
  const phase = step < 2 ? 0 : step < 6 ? 1 : 2;
  const dateLimit = localDate(new Date(new Date().getFullYear() + 2, new Date().getMonth(), new Date().getDate()));
  function validate(): string {
    const fields: (keyof Intake)[][] = [['goal'], ['motivation', 'success'], ['baseline', 'obstacle']];
    if (step < 3 && fields[step].some(k => String(intake[k]).trim().length < 3)) return 'Add a little more detail to each answer—just a few words is enough.';
    if (step === 3 && (!Number.isInteger(intake.minutesPerWeek) || intake.minutesPerWeek < 10 || intake.minutesPerWeek > 1200)) return 'Choose a whole number between 10 and 1,200 minutes a week.';
    if (step === 3 && (!intake.startDate || intake.startDate < localDate() || intake.startDate > dateLimit)) return 'Choose a start date between today and two years from now.';
    if ((step === 4 || step === 5) && (!question || (answers[question.id] || '').trim().length < 2)) return 'Choose an option or add a few words of your own.';
    return '';
  }
  async function continueFlow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const validation = validate(); if (validation) { setError(validation); return; }
    if (step === 0) track('start');
    if (step === 3 && questions.length !== 2) {
      setBusy('questions'); setError(''); controller.current = new AbortController();
      try {
        const result = await postApi<{ questions: FollowupQuestion[]; fallback?: boolean }>('/api/followups', { intake, requestId: crypto.randomUUID() }, controller.current.signal);
        if (!Array.isArray(result.questions) || result.questions.length !== 2) throw new RequestError('We couldn’t prepare your questions. Please try again.', 'INVALID_RESPONSE');
        setFallback(Boolean(result.fallback)); update(j => ({ ...j, questions: result.questions, answers: {}, step: 4 }));
      } catch (e) { if (!(e instanceof RequestError && e.code === 'CANCELLED')) setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
      finally { setBusy(null); controller.current = null; }
      return;
    }
    if (step < 6) { go(step + 1); return; }
    setBusy('plan'); setError(''); controller.current = new AbortController(); track('interview_complete');
    try {
      const followups = questions.map(q => ({ id: q.id, question: q.question, answer: answers[q.id] || '' }));
      const result = await postApi<{ plan: ResolutionPlan }>('/api/plan', { intake, followups, requestId: crypto.randomUUID() }, controller.current.signal);
      update(j => ({ ...j, plan: result.plan, step: 6 })); track('plan_complete');
      // Let the storage effect run before moving to the result route.
      setBusy(null); setEditing(false);
    } catch (e) { if (!(e instanceof RequestError && e.code === 'CANCELLED')) setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(null); controller.current = null; }
  }
  function startOver() {
    if (window.confirm('Clear your answers and start a new plan? This removes the plan saved in this browser.')) { clear(); setFallback(false); setError(''); track('clear'); }
  }
  return <><Header minimal /><main id="main-content" className="journey-layout section-container">
    <aside className="journey-aside"><Link href="/" className="back-home"><span aria-hidden="true">←</span> Back to the beginning</Link><div className="journey-side-content"><div className="journey-pal"><Image loading="eager" src="/pal.png" alt="Pal, your friendly planning companion" width={150} height={150} /></div><span className="eyebrow">A LITTLE SPACE FOR YOU</span><h2>Good things<br />start small.</h2><ol className="phase-list">{phases.map((name, i) => <li className={phase === i ? 'phase-current' : phase > i ? 'phase-done' : ''} key={name} aria-current={phase === i ? 'step' : undefined}><span>{phase > i ? <Check size={14} /> : `0${i + 1}`}</span>{name}</li>)}</ol><div className="aside-note"><Heart size={22} /><p>This is your plan.<br />It only needs to work for you.</p></div></div><div className="save-note"><span className="status-dot" />{storageWarning ? 'Keep this tab open' : 'Saved in this browser as you go'}<small>Your answers are only sent to AI when you ask for questions or a plan. <Link href="/privacy">Privacy</Link></small></div></aside>
    <section className="journey-main" aria-busy={Boolean(busy)}>{storageWarning && <div className="notice storage-notice" role="status">{storageWarning}</div>}
    {busy ? <div className="thinking-state"><div className="thinking-pal"><Image loading="eager" src="/pal.png" alt="Pal is putting your plan together" width={168} height={168} /></div><span className="eyebrow">{busy === 'questions' ? 'GETTING TO KNOW YOUR GOAL' : 'PUTTING YOUR PIECES TOGETHER'}</span><h1 ref={heading} tabIndex={-1}>{busy === 'questions' ? 'A couple of thoughtful questions…' : 'Big hopes. A doable plan.'}</h1><p>{busy === 'questions' ? 'Finding two questions to make this feel a little more like you.' : 'Making room for your ambition, your real life, and the occasional busy week.'}</p><span className="thinking-time">This may take up to a minute.</span><button type="button" className="text-button" onClick={() => controller.current?.abort()}>Back to my answers</button></div> : <form onSubmit={continueFlow} noValidate>
      {step === 0 && <div className="mobile-pal-greeting"><Image loading="eager" src="/pal.png" alt="" width={64} height={64} /><p><strong>You’ve got a Pal.</strong><br />Let’s take this one step at a time.</p></div>}<div className="step-topline"><span>{step < 4 ? `REFLECTION ${step + 1} OF 4` : step < 6 ? `A LITTLE MORE ABOUT YOU · ${step - 3} OF 2` : 'READY WHEN YOU ARE'}</span><div className="progress-dots" aria-label={`Step ${step + 1} of 7`}>{Array.from({ length: 7 }, (_, i) => <span key={i} className={i <= step ? 'progress-filled' : ''} />)}</div></div>
      {step < 4 ? <><span className="eyebrow form-eyebrow">{prompts[step].eyebrow}</span><h1 ref={heading} tabIndex={-1}>{prompts[step].title}</h1><p className="form-description">{prompts[step].description}</p></> : step < 6 ? <><span className="eyebrow form-eyebrow">LET’S MAKE THIS YOURS</span><h1 ref={heading} tabIndex={-1} className="question-heading">{question?.question || 'Let’s pick up your questions again.'}</h1><p className="form-description">{fallback ? 'A couple of grounding questions before we build your plan.' : 'A little more context helps us make a plan that fits.'}</p></> : <><span className="eyebrow form-eyebrow">LOOK AT THAT. YOU’VE ALREADY STARTED.</span><h1 ref={heading} tabIndex={-1}>Does this feel like you?</h1><p className="form-description">One last look. Then we’ll turn your thoughts into small, doable steps.</p></>}
      {error && <div className="notice error-notice" role="alert" ref={errorBox} tabIndex={-1}>{error}</div>}
      <div className="form-fields">
        {step === 0 && <><Field label="I’d like to…" id="goal" value={intake.goal} onChange={v => changeField('goal', v)} placeholder="Read more books, get outside, learn to cook…" rows={3} /><div className="idea-label">NEED A LITTLE INSPIRATION?</div><div className="example-chips">{examples.map(example => <button key={example} type="button" onClick={() => changeField('goal', example)}>{example} <span aria-hidden="true">↗</span></button>)}</div><p className="field-hint">Pick one thing for now. It doesn’t need to be perfectly worded.</p></>}
        {step === 1 && <><Field label="Why does this matter to you?" id="motivation" value={intake.motivation} onChange={v => changeField('motivation', v)} placeholder="I miss the way I feel when…" rows={3} /><Field label="In 90 days, what would a little progress look like?" id="success" value={intake.success} onChange={v => changeField('success', v)} placeholder="I’d feel proud if I could…" rows={3} /></>}
        {step === 2 && <><Field label="Where are you starting from?" id="baseline" value={intake.baseline} onChange={v => changeField('baseline', v)} placeholder="Right now, I…" rows={3} /><Field label="What might get in the way?" id="obstacle" value={intake.obstacle} onChange={v => changeField('obstacle', v)} placeholder="Busy evenings, losing motivation, not knowing where to start…" rows={3} /></>}
        {step === 3 && <><fieldset className="time-field"><legend>How much time feels realistic each week?</legend><div className="time-options">{[30, 60, 120, 180].map(n => <button type="button" aria-pressed={intake.minutesPerWeek === n} className={intake.minutesPerWeek === n ? 'selected' : ''} onClick={() => changeField('minutesPerWeek', n)} key={n}><strong>{n < 60 ? `${n} min` : `${n / 60} hr${n > 60 ? 's' : ''}`}</strong><span>per week</span></button>)}</div><label className="custom-time" htmlFor="minutes">Or your own number <input id="minutes" type="number" min={10} max={1200} step={1} value={intake.minutesPerWeek} onChange={e => changeField('minutesPerWeek', e.target.value === '' ? 0 : Number(e.target.value))} inputMode="numeric" /> <span>min / week</span></label><p className="field-hint">Aim for a normal week, not your most ambitious one.</p></fieldset><fieldset className="date-field"><legend>When would you like to start?</legend><div className="date-options"><button type="button" aria-pressed={intake.startDate === localDate()} className={intake.startDate === localDate() ? 'selected' : ''} onClick={() => changeField('startDate', localDate())}>Today <span>{formatDate(localDate(), true)}</span></button><button type="button" aria-pressed={intake.startDate === nextJanuaryFirst()} className={intake.startDate === nextJanuaryFirst() ? 'selected' : ''} onClick={() => changeField('startDate', nextJanuaryFirst())}>A new year <span>January 1</span></button></div><label className="custom-date" htmlFor="start-date">Or choose a date <input id="start-date" type="date" min={localDate()} max={dateLimit} value={intake.startDate} onChange={e => changeField('startDate', e.target.value)} /></label></fieldset></>}
        {(step === 4 || step === 5) && (question ? <>{question.options.length > 0 && <div className="answer-options">{question.options.map(option => <button type="button" key={option} aria-pressed={answers[question.id] === option} className={answers[question.id] === option ? 'selected' : ''} onClick={() => changeAnswer(question.id, option)}><span className="option-radio">{answers[question.id] === option && <span />}</span>{option}</button>)}</div>}<Field label={question.options.length ? 'Or answer in your own words' : 'Your answer'} id={`answer-${question.id}`} value={answers[question.id] || ''} onChange={v => changeAnswer(question.id, v)} placeholder="Here’s what feels right for me…" rows={3} /></> : <button className="button button-outline" type="button" onClick={() => go(3)}>Return to my reflection</button>)}
        {step === 6 && <div className="review-list"><Review title="MY SOMETHING" edit={() => go(0)}><strong>{intake.goal}</strong></Review><Review title="MY REASON" edit={() => go(1)}><p>{intake.motivation}</p><span className="review-subtitle">PROGRESS WOULD LOOK LIKE</span><p>{intake.success}</p></Review><Review title="MY REAL LIFE" edit={() => go(2)}><p>{intake.baseline}</p><span className="review-subtitle">WHAT MIGHT GET IN THE WAY</span><p>{intake.obstacle}</p></Review><Review title="MY COMMITMENT" edit={() => go(3)}><p>{intake.minutesPerWeek} minutes a week · Starting {formatDate(intake.startDate)}</p></Review>{questions.map((q, i) => <Review title={q.question} key={q.id} edit={() => go(i + 4)}><p>{answers[q.id]}</p></Review>)}</div>}
      </div>
      <div className="form-navigation">{step > 0 ? <button type="button" className="text-button back-button" onClick={() => go(step - 1)}><Arrow size={18} /> Back</button> : <span />}<button className="button button-primary" type="submit">{step === 6 ? 'Make my plan' : step === 5 ? 'Review my answers' : 'Keep going'} <Arrow size={19} /></button></div>
      {step === 6 && <p className="ai-note">A little help from AI, grounded in your answers. Your judgment always comes first.</p>}
    </form>}
    <p className="mobile-save-note">{storageWarning ? 'Keep this tab open. Browser saving is unavailable.' : 'Your answers save in this browser as you go.'} Your answers are sent to AI when you request questions or a plan. <Link href="/privacy">Privacy</Link></p>
    {!busy && <div className="journey-bottom"><span>Small steps count.</span><button type="button" className="text-button" onClick={startOver}>Clear my answers</button></div>}
    </section>
  </main></>;
}
function Field({ label, id, value, onChange, placeholder, rows = 3 }: { label: string; id: string; value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) {
  const maxLength = id === 'goal' ? 500 : ['success', 'baseline', 'obstacle'].includes(id) ? 800 : 1000;
  return <div className="field-group"><label htmlFor={id}>{label}</label><textarea id={id} value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} maxLength={maxLength} required aria-describedby={value.length > maxLength - 100 ? `${id}-count` : undefined} />{value.length > maxLength - 100 && <small className="character-count" id={`${id}-count`}>{value.length} / {maxLength.toLocaleString()} characters</small>}</div>;
}
function Review({ title, edit, children }: { title: string; edit: () => void; children: React.ReactNode }) { return <section className="review-item"><div className="review-label"><h2>{title}</h2><button type="button" className="text-button" onClick={edit}>Edit<span className="sr-only"> {title.toLowerCase()}</span></button></div>{children}</section>; }
