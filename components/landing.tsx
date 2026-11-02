'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { readJourney } from '@/lib/journey';
import { track } from '@/lib/client';
import { Arrow, Check, Clock, Heart, Leaf, Spark } from './icons';
import { Header, Footer } from './header';

export default function Landing() {
  const [resume, setResume] = useState<'draft' | 'plan' | null>(null);

  useEffect(() => {
    try {
      const saved = readJourney();
      if (saved?.plan) setResume('plan');
      else if (saved?.intake.goal) setResume('draft');
    } catch { /* A fresh start remains available. */ }
    try {
      if (!sessionStorage.getItem('resolutionpal.visited')) {
        track('visit');
        sessionStorage.setItem('resolutionpal.visited', '1');
      }
    } catch { track('visit'); }
  }, []);

  const destination = resume === 'plan' ? '/plan' : '/start';
  const buttonLabel = resume === 'plan' ? 'View my plan' : resume === 'draft' ? 'Continue my plan' : 'Make my plan';

  return <>
    <Header />
    <main id="main-content" className="landing-page">
      <section className="hero section-container">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow"><Spark size={15} /> BIG HOPES. SMALL, DOABLE STEPS.</div>
          <h1>A resolution<br />that fits your<br /><span className="highlight-word">real life<svg viewBox="0 0 350 20" preserveAspectRatio="none" aria-hidden="true"><path d="M5 13Q165-3 343 10M24 18Q170 4 322 16" /></svg></span><span className="hero-period">.</span></h1>
          <p className="hero-description">You don’t need to become a whole new person.<br className="desktop-break" /> Just take the next step toward something that matters.</p>
          <div className="hero-action">
            <Link className="button button-primary" href={destination}>{buttonLabel} <Arrow /></Link>
            <p><Clock size={15} /> A few thoughtful minutes. Free. No signup.</p>
          </div>
          <div className="hero-small-note"><Spark className="tiny-star" size={17} /> A fresh start doesn’t need a new year.</div>
        </div>

        <div className="pal-hero-art">
          <div className="pal-scene">
            <div className="pal-stage" aria-hidden="true" />
            <div className="pal-sun" aria-hidden="true"><Spark size={42} /></div>
            <div className="pal-speech"><span>Hi, I’m Pal.</span><strong>Big hat.<br />Small, doable steps.</strong><Heart size={17} /></div>
            <Image className="hero-pal" src="/pal.png" alt="Pal, your cheerful planning friend in a big top hat, with a pen and a scroll" width={350} height={350} sizes="(max-width: 760px) 228px, (max-width: 1050px) 300px, 350px" priority />
            <span className="pal-caption">Your fresh-start friend.</span>
          </div>
          <div className="pal-example-card">
            <div className="pal-example-top"><span><Leaf size={17} /> A LITTLE LOOK AHEAD</span><span className="pal-example-label">Example plan</span></div>
            <h2>More pages.<br /><span>Less scrolling.</span></h2>
            <div className="pal-example-week"><strong>MY FIRST WEEK</strong><span>45 minutes. That’s all.</span></div>
            <ul>
              <li><span className="pal-example-check"><Check size={13} /></span><span>Pick a book I’m excited about</span><small>10m</small></li>
              <li><span className="pal-example-check"><Check size={13} /></span><span>Give it a spot by my favorite chair</span><small>5m</small></li>
              <li><span className="pal-example-check"><Check size={13} /></span><span>Read 10 minutes, three times</span><small>30m</small></li>
            </ul>
            <div className="pal-example-kindness"><Heart size={17} /> Busy week? One page still counts.</div>
          </div>
          <div className="pal-progress-seal"><Spark size={19} /><span>A little<br />progress is</span><strong>a big deal.</strong></div>
        </div>
      </section>

      <div className="promise-strip">
        <div><Check size={18} /> Made around your life</div><Spark className="strip-spark" size={15} />
        <div><Check size={18} /> A gentle nudge, not a guilt trip</div><Spark className="strip-spark" size={15} />
        <div><Check size={18} /> Yours to keep</div>
      </div>

      <section className="how-section section-container" id="how-it-works">
        <div className="section-heading">
          <span className="eyebrow">FROM “SOMEDAY” TO YOUR NEXT STEP</span>
          <h2>A little reflection.<br />A real way forward.</h2>
          <p>Bring a big dream, a quiet hope, or that thing<br className="desktop-break" /> you keep meaning to start. We’ll take it from there.</p>
        </div>
        <div className="how-grid">
          <article className="how-card how-card-lilac"><div className="step-number"><span>01</span><Heart size={28} /></div><h3>Find your thing.</h3><p>Tell us what you want to change and why it matters to you. There’s no right size for a resolution.</p><span className="how-card-note">Start with what matters.</span></article>
          <article className="how-card how-card-yellow"><div className="step-number"><span>02</span><Clock size={28} /></div><h3>Make it fit.</h3><p>A few thoughtful questions about your time, your starting point, and what tends to get in the way.</p><span className="how-card-note">Your actual, everyday life.</span></article>
          <article className="how-card how-card-mint"><div className="step-number"><span>03</span><Leaf size={28} /></div><h3>Start small. Keep going.</h3><p>Get your first-week actions, a 90-day path, and a smaller version for the weeks life happens.</p><span className="how-card-note">A plan with room to be human.</span></article>
        </div>
      </section>

      <section className="possibilities section-container">
        <div><span className="eyebrow">WHATEVER YOUR “SOMETHING” IS</span><h2>It doesn’t have<br />to change everything.</h2><p>It just has to mean something to you.</p></div>
        <div className="goal-cloud">
          <span className="goal-pill pill-lilac">Move a little more <Arrow size={18} /></span>
          <span className="goal-pill pill-coral">Call my people <Heart size={20} /></span>
          <span className="goal-pill pill-yellow">Make something <Spark size={20} /></span>
          <span className="goal-pill pill-white">Learn for the fun of it <span aria-hidden="true">✎</span></span>
          <span className="goal-pill pill-green">Find a little calm <Leaf size={20} /></span>
          <span className="goal-pill pill-white">Start that thing <Arrow size={18} /></span>
        </div>
      </section>

      <section className="origin section-container">
        <div className="origin-inner">
          <div className="pal-portrait"><Image src="/pal.png" alt="Pal, a little character with a big hat and a plan" width={150} height={150} /></div>
          <div><span className="eyebrow">A SMALL PROJECT WITH A SOFT SPOT FOR FRESH STARTS</span><h2>Hi, I’m Dylan. I love a good resolution.</h2><p>I first built Resolution Pal during parental leave, as a little experiment in helping big intentions become real plans. This is its fresh start. I hope it helps with yours.</p><span className="origin-signature">Made with curiosity, and a little optimism.</span></div>
          <Spark className="origin-spark" size={50} />
        </div>
      </section>

      <section className="last-cta section-container">
        <div className="last-cta-panel">
          <div className="last-cta-flower" aria-hidden="true"><Spark size={35} /></div>
          <span className="eyebrow">YOU DON’T HAVE TO DO IT ALL TODAY</span>
          <h2>Your next chapter<br />can start small.</h2>
          <Link className="button button-primary" href={destination}>{resume ? buttonLabel : 'Let’s make a plan'} <Arrow /></Link>
          <p>No perfect timing required. Your Pal is ready when you are.</p>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
