'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postApi, RequestError, track } from '@/lib/client';
import { addDays, formatDate, localDate, nextJanuaryFirst } from '@/lib/dates';
import { useJourney } from '@/lib/journey';
import type { AdaptiveJourney, AdaptiveTurn, ResolutionPlan } from '@/lib/types';
import { Header } from './header';
import { Arrow, Check, Heart } from './icons';

const category: AdaptiveTurn = {
  question: 'What would you like to make more room for?',
  options: [
    'Move more',
    'Read or learn',
    'Make something',
    'Connect with people',
    'Rest and reset',
    'Work and money',
    'Help me choose',
  ],
};

const conversationLength = 6;
const questionCount = 8;
const timeQuestion = 'How much time can you give this in a typical week?';
const dateQuestion = 'When would you like to start?';
const weeklyChoices = [10, 30, 60, 120];
const phases = ['Find your thing', 'Make it fit', 'Your next steps'];
const emptyQuiz: AdaptiveJourney = {
  step: 0,
  turns: [category],
  minutesPerWeek: null,
  startDate: null,
};

function startChoices(savedDate: string | null) {
  const now = new Date();
  const today = localDate(now);
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  const choices = new Map<string, string>();
  for (const [date, label] of [
    [today, 'Today'],
    [addDays(today, 1), 'Tomorrow'],
    [addDays(today, daysToMonday), 'Next Monday'],
    [nextJanuaryFirst(now), 'January 1'],
  ]) {
    if (!choices.has(date)) choices.set(date, label);
  }
  if (savedDate && !choices.has(savedDate)) choices.set(savedDate, 'Keep my chosen date');
  return Array.from(choices, ([date, label]) => ({ date, label }));
}

function toAnswers(turns: AdaptiveTurn[]) {
  return turns.flatMap(({ question, answer }) => answer ? [{ question, answer }] : []);
}

export default function JourneyFlow() {
  const { journey, update, clear, storageWarning } = useJourney();
  const router = useRouter();
  const [editing, setEditing] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'question' | 'plan' | null>(null);
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const quiz = journey?.adaptive ?? emptyQuiz;
  const { step, minutesPerWeek, startDate } = quiz;
  const turns = quiz.turns.length ? quiz.turns : emptyQuiz.turns;
  const currentQuestion = turns[step];
  const pendingAnswer = currentQuestion?.answer && step + 1 < conversationLength && !turns[step + 1]
    ? currentQuestion.answer
    : undefined;
  const buildingPlan = busy === 'plan';
  const opening = !journey || editing === null || (Boolean(journey.plan) && !editing);

  useEffect(() => {
    setEditing(new URLSearchParams(window.location.search).has('edit'));
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    if (journey?.plan && editing === false) router.replace('/plan');
  }, [journey?.plan, editing, router]);
  useEffect(() => {
    if (!opening) heading.current?.focus();
  }, [opening, step, buildingPlan]);
  useEffect(() => {
    if (error) errorBox.current?.focus();
  }, [error]);

  function saveQuiz(next: AdaptiveJourney) {
    update((current) => ({ ...current, adaptive: next }));
  }

  function go(nextStep: number) {
    if (controller.current) return;
    setError('');
    saveQuiz({ ...quiz, turns, step: nextStep });
  }

  async function withRequest(kind: 'question' | 'plan', run: (signal: AbortSignal) => Promise<void>) {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setError('');
    setBusy(kind);
    try {
      await run(request.signal);
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
      }
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setBusy(null);
      }
    }
  }

  function cancelRequest() {
    controller.current?.abort();
    controller.current = null;
    setBusy(null);
    heading.current?.focus();
  }

  function chooseAnswer(answer: string) {
    if (controller.current || !currentQuestion || step >= conversationLength) return;
    const sameAnswer = currentQuestion.answer === answer;
    if (step === 0 && !currentQuestion.answer) track('start');
    setError('');

    if (sameAnswer && (step === conversationLength - 1 || turns[step + 1])) {
      go(step + 1);
      return;
    }

    const branch = [...turns.slice(0, step), { ...currentQuestion, answer }];
    const next = { ...quiz, turns: branch, minutesPerWeek: null, startDate: null };
    if (step === conversationLength - 1) {
      saveQuiz({ ...next, step: step + 1 });
      return;
    }

    saveQuiz(next);
    void withRequest('question', async (signal) => {
      const result = await postApi<{ question: Pick<AdaptiveTurn, 'question' | 'options'> }>(
        '/api/question',
        { answers: toAnswers(branch), requestId: crypto.randomUUID() },
        signal,
      );
      if (signal.aborted) return;
      const question = result.question;
      if (!question || typeof question.question !== 'string' || !Array.isArray(question.options)
        || question.options.length < 3 || question.options.length > 4
        || !question.options.every((option) => typeof option === 'string' && option.trim())) {
        throw new RequestError('Pal couldn’t read the next question. Try that choice again.', 'INVALID_RESPONSE');
      }
      saveQuiz({ ...next, step: step + 1, turns: [...branch, question] });
    });
  }

  function chooseTime(minutes: number) {
    const chosenDate = minutesPerWeek === minutes ? startDate : null;
    setError('');
    saveQuiz({ ...quiz, turns, step: conversationLength + 1, minutesPerWeek: minutes, startDate: chosenDate });
  }

  function chooseDate(date: string) {
    setError('');
    saveQuiz({ ...quiz, turns, step: questionCount, startDate: date });
    if (!startDate) track('interview_complete');
  }

  function makePlan() {
    if (controller.current || minutesPerWeek === null || !startDate) return;
    const answers = toAnswers(turns);
    if (answers.length !== conversationLength) return;
    void withRequest('plan', async (signal) => {
      const { plan } = await postApi<{ plan: ResolutionPlan }>(
        '/api/plan',
        { answers, minutesPerWeek, startDate, requestId: crypto.randomUUID() },
        signal,
      );
      if (signal.aborted) return;
      if (!plan) throw new RequestError('Pal couldn’t read your plan. Please try again.', 'INVALID_RESPONSE');
      update((current) => ({
        ...current,
        adaptive: { ...quiz, turns, step: questionCount },
        intake: { ...current.intake, goal: answers[1].answer, minutesPerWeek, startDate },
        plan,
      }));
      track('plan_complete');
      setEditing(false);
    });
  }

  function startOver() {
    if (controller.current) return;
    const message = journey?.plan
      ? 'Clear your answers and the plan stored in this browser?'
      : 'Clear your answers and start over?';
    if (!window.confirm(message)) return;
    clear();
    setError('');
    heading.current?.focus();
    track('clear');
  }

  if (opening) {
    return <>
      <Header minimal />
      <main className="loading-shell" id="main-content">
        <Image loading="eager" src="/pal.png" alt="" width={100} height={100} />
        <p>Finding your place…</p>
      </main>
    </>;
  }

  const phase = step < 2 ? 0 : step < questionCount ? 1 : 2;
  const question = step === conversationLength ? timeQuestion
    : step === conversationLength + 1 ? dateQuestion
      : step === questionCount ? 'Ready for your plan?'
        : currentQuestion.question;

  return <>
    <Header minimal />
    <main id="main-content" className="journey-layout section-container">
      <aside className="journey-aside">
        <Link href="/" className="back-home"><span aria-hidden="true">←</span> Back to the beginning</Link>
        <div className="journey-side-content">
          <div className="journey-pal">
            <Image loading="eager" src="/pal.png" alt="Pal, your friendly planning companion" width={150} height={150} />
          </div>
          <ol className="phase-list">
            {phases.map((name, index) => (
              <li key={name} className={phase === index ? 'phase-current' : phase > index ? 'phase-done' : ''} aria-current={phase === index ? 'step' : undefined}>
                <span aria-hidden="true">{phase > index ? <Check size={14} /> : index + 1}</span>{name}
              </li>
            ))}
          </ol>
          <div className="aside-note"><Heart size={22} /><p>This is your plan. It only needs to work for you.</p></div>
        </div>
        <div className="save-note">
          <span className="status-dot" />
          {storageWarning ? 'Keep this tab open' : 'Saved in this browser as you go'}
          <small>Pal uses AI to ask your next question and make your plan. <Link href="/privacy">Privacy</Link></small>
        </div>
      </aside>
      <section className="journey-main adaptive-quiz">
        {storageWarning && <div className="notice storage-notice" role="status">{storageWarning}</div>}
        <div className="step-topline">
          <span>{step < questionCount ? `Question ${step + 1} of ${questionCount}` : 'Answers complete'}</span>
          <div className="progress-dots" aria-hidden="true">
            {Array.from({ length: questionCount }, (_, index) => (
              <span key={index} className={index < step ? 'progress-filled' : index === step ? 'progress-current' : ''} />
            ))}
          </div>
        </div>
        {buildingPlan ? (
          <div className="thinking-state">
            <div className="thinking-pal"><Image loading="eager" src="/pal.png" alt="" width={168} height={168} /></div>
            <h1 ref={heading} tabIndex={-1}>Pal’s making your plan…</h1>
            <p>Bringing your answers together into a first week that fits.</p>
            <button type="button" className="text-button" onClick={cancelRequest}>Back to my answers</button>
          </div>
        ) : (
          <>
            {step === 0 && (
              <div className="mobile-pal-greeting">
                <Image loading="eager" src="/pal.png" alt="" width={56} height={56} />
                <p><strong>Hi, I’m Pal.</strong> Let’s find one small thing to work on.</p>
              </div>
            )}
            <h1 key={step} ref={heading} tabIndex={-1} id="quiz-question" className="question-heading">{question}</h1>
            {step === 0 && <p className="form-description">Tap what feels right. Your answer shapes what Pal asks next.</p>}
            {error && <div className="notice error-notice" role="alert" ref={errorBox} tabIndex={-1}>{error}</div>}
            {step < conversationLength && (
              <>
                <div className="quiz-next-status" role="status">
                  {busy === 'question' && <p><span className="quiz-thinking-dot" />Pal’s finding the next question…</p>}
                </div>
                <div className={`answer-options quiz-choices${step === 0 ? ' quiz-categories' : ''}`} role="group" aria-labelledby="quiz-question">
                  {currentQuestion.options.map((option) => (
                    <Choice
                      key={option}
                      chosen={currentQuestion.answer === option}
                      locked={busy === 'question'}
                      onClick={() => chooseAnswer(option)}
                    >
                      {option}
                    </Choice>
                  ))}
                </div>
                {pendingAnswer && !busy && (
                  <button type="button" className="button button-outline quiz-retry" onClick={() => chooseAnswer(pendingAnswer)}>
                    {error ? 'Try again' : 'Continue with my answer'} <Arrow size={17} />
                  </button>
                )}
              </>
            )}
            {step === conversationLength && (
              <div className="answer-options quiz-choices quiz-commitment" role="group" aria-labelledby="quiz-question">
                {weeklyChoices.map((minutes) => (
                  <Choice key={minutes} chosen={minutesPerWeek === minutes} onClick={() => chooseTime(minutes)}>
                    {`${minutes} minutes`}
                  </Choice>
                ))}
              </div>
            )}
            {step === conversationLength + 1 && (
              <div className="answer-options quiz-choices quiz-commitment" role="group" aria-labelledby="quiz-question">
                {startChoices(startDate).map(({ date, label }) => (
                  <Choice key={date} chosen={startDate === date} detail={formatDate(date, true)} onClick={() => chooseDate(date)}>
                    {label}
                  </Choice>
                ))}
              </div>
            )}
            {step === questionCount && (
              <>
                <p className="form-description">Pal will turn your choices into a plan for your first week and the next 90 days.</p>
                <div className="quiz-summary">
                  <strong>{turns[1].answer}</strong>
                  <p>{minutesPerWeek} minutes a week · Starting {formatDate(startDate!, true)}</p>
                </div>
                <button type="button" className="button button-primary" onClick={makePlan}>
                  Make my plan <Arrow size={19} />
                </button>
                <details className="quiz-review">
                  <summary>Review and edit my answers</summary>
                  <ul className="review-list">
                    {turns.map(({ question: prompt, answer }, index) => (
                      <Review key={index} prompt={prompt} onEdit={() => go(index)}>{answer}</Review>
                    ))}
                    <Review prompt={timeQuestion} onEdit={() => go(conversationLength)}>{minutesPerWeek} minutes</Review>
                    <Review prompt={dateQuestion} onEdit={() => go(conversationLength + 1)}>{formatDate(startDate!)}</Review>
                  </ul>
                </details>
              </>
            )}
            <div className="quiz-navigation">
              {busy === 'question'
                ? <button type="button" className="text-button back-button" onClick={cancelRequest}><Arrow size={18} /> Cancel next question</button>
                : step > 0 && <button type="button" className="text-button back-button" onClick={() => go(step - 1)}><Arrow size={18} /> Back</button>}
              {!busy && (Boolean(quiz.turns[0]?.answer) || journey?.intake.goal) && (
                <button type="button" className="text-button" onClick={startOver}>Clear my answers</button>
              )}
            </div>
          </>
        )}
        <p className="mobile-save-note">
          {storageWarning ? 'Keep this tab open. Browser saving is unavailable.' : 'Your answers save in this browser.'} Pal uses AI to ask questions and make your plan. <Link href="/privacy">Privacy</Link>
        </p>
      </section>
    </main>
  </>;
}

function Choice({ children, chosen, detail, locked, onClick }: {
  children: string;
  chosen: boolean;
  detail?: string;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={chosen ? 'selected' : ''} aria-disabled={locked || undefined} onClick={onClick}>
      <span className="quiz-choice-label">{children}<small className="sr-only">{chosen ? ' (your answer)' : ''}</small></span>
      {detail && <span className="quiz-choice-date">{detail}</span>}
      {chosen ? <Check size={17} /> : <Arrow size={17} />}
    </button>
  );
}

function Review({ prompt, children, onEdit }: {
  prompt: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <li className="review-item">
      <div><p>{prompt}</p><strong>{children}</strong></div>
      <button type="button" className="text-button" onClick={onEdit}>Edit<span className="sr-only"> answer to {prompt}</span></button>
    </li>
  );
}
