import type { Metadata, Viewport } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import './globals.css';
import './companion.css';
import './landing-personality.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://resolutionpal.com'),
  title: { default: 'Resolution Pal — A resolution that fits your real life', template: '%s · Resolution Pal' },
  description: 'A few thoughtful questions. One meaningful resolution. Make a personal plan for your first week and the next 90 days. Free, with no signup.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'A resolution that fits your real life',
    description: 'A few thoughtful questions. One clear next step. Meet your Resolution Pal.',
    url: 'https://resolutionpal.com', siteName: 'Resolution Pal', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Resolution Pal', description: 'Turn one meaningful goal into a plan that fits your real life.' },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fbf7ef' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body style={{ '--font-sans': '"DM Sans", sans-serif', '--font-display': '"Fraunces", Georgia, serif' } as React.CSSProperties}><a href="#main-content" className="skip-link">Skip to content</a>{children}</body></html>;
}
