import type { Metadata } from 'next';
import { ReplayContainer } from '@/components/replay/replay-container';

interface ReplayPageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: ReplayPageProps): Promise<Metadata> {
  const { sessionId } = await params;

  return {
    title: `Conversation Replay — SYNAPSE`,
    description: `Watch the replay of conversation session ${sessionId} on SYNAPSE — the multi-agent AI conversation platform.`,
    openGraph: {
      title: 'Conversation Replay — SYNAPSE',
      description: 'Watch AI agents discuss complex problems from multiple perspectives.',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: 'Conversation Replay — SYNAPSE',
      description: 'Watch AI agents discuss complex problems from multiple perspectives.',
    },
  };
}

export default async function ReplayPage({ params }: ReplayPageProps) {
  const { sessionId } = await params;

  return <ReplayContainer sessionId={sessionId} />;
}
