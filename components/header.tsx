import Link from 'next/link';
import Image from 'next/image';
export function Header({ minimal = false }: { minimal?: boolean }) {
  return <header className="site-header"><div className="header-inner"><Link href="/" className="wordmark" aria-label="Resolution Pal home"><span className="brand-mascot"><Image loading="eager" src="/pal.png" alt="" width={64} height={64} /></span>resolution<span className="brand-pal">pal</span><span className="brand-dot">.</span></Link>{minimal ? <span className="header-note">A little courage. A little company.</span> : <nav aria-label="Main navigation"><a href="/#how-it-works" className="nav-link">How it works</a><Link href="/start" className="button button-small button-outline">Make my plan <ArrowIcon /></Link></nav>}</div></header>;
}
function ArrowIcon() { return <span aria-hidden="true">↗</span>; }
export function Footer() { return <footer className="site-footer"><Link href="/" className="footer-brand">resolutionpal.</Link><p>A little ambition. A little kindness. A plan that’s yours.</p><div><Link href="/privacy">Privacy</Link><span>Made by Dylan</span></div></footer>; }
