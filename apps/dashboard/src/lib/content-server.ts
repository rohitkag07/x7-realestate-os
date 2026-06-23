import { createServiceClient } from '@/lib/supabase/server';
import { callSummonerDispatch } from '@/lib/summoner-server';

/**
 * Phase 3 content-engine server helpers — mirrors sales-server.ts.
 * Talks to the content-agent over HTTP using the x-agent-secret header.
 */
const contentAgentUrl = process.env.CONTENT_AGENT_URL || 'http://localhost:8083';
const agentSecret = process.env.AGENT_SECRET || '';

export function serviceClientOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

export async function callContentAgent<T>(path: string, payload: unknown): Promise<T | null> {
  const viaSummoner = await callSummonerDispatch<T>('content', path, payload);
  if (viaSummoner) return viaSummoner;

  try {
    const response = await fetch(`${contentAgentUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(agentSecret ? { 'x-agent-secret': agentSecret } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function logAgentRun({
  builderId,
  projectId,
  action,
  input,
  output,
  status = 'success',
}: {
  builderId?: string | null;
  projectId?: string | null;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status?: 'success' | 'partial' | 'failure';
}) {
  const supabase = serviceClientOrNull();
  if (!supabase || !builderId) return;
  await (supabase.from('agent_runs') as any).insert({
    builder_id: builderId,
    agent: 'content-agent-proxy',
    action,
    project_id: projectId ?? null,
    input,
    output,
    status,
  });
}

/**
 * Deterministic fallback calendar used when the content-agent is
 * unreachable — keeps the dashboard action functional offline.
 */
export function fallbackCalendarSummary(month: string | undefined) {
  const target = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  return {
    ok: true,
    source: 'fallback' as const,
    month: target,
    count: 0,
    note: 'Content agent offline — connect CONTENT_AGENT_URL to generate a live 30-day calendar.',
  };
}
