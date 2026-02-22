import { DebateContainer } from '@/components/debate/debate-container';

export default async function DebatePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { sessionId } = await params;
  const { p: problem } = await searchParams;
  return <DebateContainer sessionId={sessionId} problem={problem} />;
}
