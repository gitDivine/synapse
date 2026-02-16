import type { DebateSession, UserIntervention } from './types';

const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

class SessionStore {
  private sessions = new Map<string, DebateSession>();

  create(id: string, session: DebateSession): void {
    this.sessions.set(id, session);
    this.cleanup();
  }

  get(id: string): DebateSession | undefined {
    return this.sessions.get(id);
  }

  update(id: string, partial: Partial<DebateSession>): void {
    const existing = this.sessions.get(id);
    if (existing) {
      this.sessions.set(id, { ...existing, ...partial });
    }
  }

  pushIntervention(id: string, intervention: UserIntervention): boolean {
    const session = this.sessions.get(id);
    if (!session || session.status !== 'active') return false;
    session.interventionQueue.push(intervention);
    return true;
  }

  drainInterventions(id: string): UserIntervention[] {
    const session = this.sessions.get(id);
    if (!session) return [];
    const items = session.interventionQueue.splice(0);
    return items;
  }

  addReaction(id: string, messageId: string, emoji: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    if (!session.reactions) session.reactions = {};
    if (!session.reactions[messageId]) session.reactions[messageId] = {};
    session.reactions[messageId][emoji] = (session.reactions[messageId][emoji] ?? 0) + 1;
  }

  getReactions(id: string): Record<string, Record<string, number>> {
    return this.sessions.get(id)?.reactions ?? {};
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt > MAX_AGE_MS) {
        this.sessions.delete(id);
      }
    }
  }
}

export const sessionStore = new SessionStore();
