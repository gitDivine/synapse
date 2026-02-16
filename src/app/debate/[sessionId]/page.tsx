import { DebateContainer } from '@/components/debate/debate-container';

export default async function DebatePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <DebateContainer sessionId={sessionId} />;
}
