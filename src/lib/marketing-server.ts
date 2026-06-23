import { createServiceClient } from '@/lib/supabase/server';
import { callSummonerDispatch } from '@/lib/summoner-server';

/**
 * Phase 4 marketing server helpers — mirrors sales-server.ts.
 * Talks to ads-agent + ghost-closer over HTTP with x-agent-secret.
 */
const adsAgentUrl = process.env.ADS_AGENT_URL || 'http://localhost:8085';
const ghostCloserUrl = process.env.GHOST_CLOSER_URL || 'http://localhost:8086';
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

export async function callAdsAgent<T>(path: string, payload: unknown) {
  const viaSummoner = await callSummonerDispatch<T>('ads', path, payload);
  if (viaSummoner) return viaSummoner;
  return call<T>(adsAgentUrl, path, payload);
}
export const callGhostCloser = <T>(path: string, payload: unknown) => call<T>(ghostCloserUrl, path, payload);
