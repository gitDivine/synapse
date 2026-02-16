import type { Metadata } from 'next';
import { ReplayContainer } from '@/components/replay/replay-container';

interface ReplayPageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: ReplayPageProps): Promise<Metadata> {
  const { sessionId } = await params;

  return {
    title: `Debate Replay — SYNAPSE`,
    description: `Watch the replay of debate session ${sessionId} on SYNAPSE — the multi-agent AI debate platform.`,
    openGraph: {
      title: 'Debate Replay — SYNAPSE',
      description: 'Watch AI agents debate complex problems from multiple perspectives.',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: 'Debate Replay — SYNAPSE',
      description: 'Watch AI agents debate complex problems from multiple perspectives.',
    },
  };
}

export default async function ReplayPage({ params }: ReplayPageProps) {
  const { sessionId } = await params;

  return <ReplayContainer sessionId={sessionId} />;
}
