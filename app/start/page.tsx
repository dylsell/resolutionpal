import type { Metadata } from 'next';
import JourneyFlow from '@/components/journey-flow';
export const metadata: Metadata = { title: 'Make your plan', robots: { index: false, follow: true } };
export default function StartPage() { return <JourneyFlow />; }
