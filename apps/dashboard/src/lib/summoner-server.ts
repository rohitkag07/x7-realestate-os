const summonerUrl = process.env.SUMMONER_URL || process.env.NEXT_PUBLIC_SUMMONER_URL || 'http://localhost:8082';
const agentSecret = process.env.AGENT_SECRET || '';

type TargetAgent = 'sales' | 'content' | 'ads' | 'colony' | 'finance';

async function post<T>(path: string, payload: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${summonerUrl}${path}`, {
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

export async function callSummonerDispatch<T>(targetAgent: TargetAgent, endpoint: string, payload: unknown): Promise<T | null> {
  const response = await post<{ ok: boolean; result?: T }>('/dispatch', {
    target_agent: targetAgent,
    endpoint,
    payload,
  });

  if (!response?.ok) return null;
  return response.result ?? null;
}

export async function callSummonerRoute<T>(payload: unknown): Promise<T | null> {
  return post<T>('/route', payload);
}

export async function getSummonerHealth<T>(): Promise<T | null> {
  try {
    const response = await fetch(`${summonerUrl}/health/dependencies`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
