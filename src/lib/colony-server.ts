import { createServiceClient } from '@/lib/supabase/server';
import { callSummonerDispatch } from '@/lib/summoner-server';

/**
 * Phase 5 colony server helpers — mirrors sales-server.ts.
 * Talks to colony-agent + finance-agent over HTTP with x-agent-secret.
 */
const colonyAgentUrl = process.env.COLONY_AGENT_URL || 'http://localhost:8087';
const financeAgentUrl = process.env.FINANCE_AGENT_URL || 'http://localhost:8088';
const agentSecret = process.env.AGENT_SECRET || '';

export function serviceClientOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

async function call<T>(base: string, path: string, payload: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(agentSecret ? { 'x-agent-secret': agentSecret } : {}) },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function callColonyAgent<T>(path: string, payload: unknown) {
  const viaSummoner = await callSummonerDispatch<T>('colony', path, payload);
  if (viaSummoner) return viaSummoner;
  return call<T>(colonyAgentUrl, path, payload);
}

export async function callFinanceAgent<T>(path: string, payload: unknown) {
  const viaSummoner = await callSummonerDispatch<T>('finance', path, payload);
  if (viaSummoner) return viaSummoner;
  return call<T>(financeAgentUrl, path, payload);
}
