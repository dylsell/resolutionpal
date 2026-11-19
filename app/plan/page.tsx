import type { Metadata } from 'next';
import PlanResult from '@/components/plan-result';
export const metadata: Metadata = { title: 'Your next chapter', robots: { index: false, follow: true } };
export default function PlanPage() { return <PlanResult />; }
