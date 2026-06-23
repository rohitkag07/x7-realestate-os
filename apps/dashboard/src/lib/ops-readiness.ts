import { createServiceClient } from '@/lib/supabase/server';

type ReadinessStatus = 'ready' | 'partial' | 'blocked' | 'manual';

type EnvGroup = {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  required: string[];
  missing: string[];
};

type ServiceState = {
  key: string;
  label: string;
  url: string;
  configured: boolean;
  reachable: boolean;
  status: ReadinessStatus;
  detail: string;
  health: unknown | null;
  dependencies: unknown | null;
};

type DataProbe = {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  count: number | null;
};

type LaunchGate = {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type OpsReadiness = {
  generatedAt: string;
  envGroups: EnvGroup[];
  services: ServiceState[];
  dataProbes: DataProbe[];
  launchGates: LaunchGate[];
};

const env = process.env;

const serviceRegistry = [
  { key: 'summoner', label: 'Summoner', url: env.SUMMONER_URL || env.NEXT_PUBLIC_SUMMONER_URL || 'http://localhost:8082' },
  { key: 'sales', label: 'Sales Agent', url: env.SALES_AGENT_URL || 'http://localhost:8080' },
  { key: 'tool_gateway', label: 'Tool Gateway', url: env.TOOL_GATEWAY_URL || 'http://localhost:8081' },
  { key: 'content', label: 'Content Agent', url: env.CONTENT_AGENT_URL || 'http://localhost:8083' },
  { key: 'ads', label: 'Ads Agent', url: env.ADS_AGENT_URL || 'http://localhost:8085' },
  { key: 'ghost_closer', label: 'Ghost Closer', url: env.GHOST_CLOSER_URL || 'http://localhost:8086' },
  { key: 'colony', label: 'Colony Agent', url: env.COLONY_AGENT_URL || 'http://localhost:8087' },
  { key: 'finance', label: 'Finance Agent', url: env.FINANCE_AGENT_URL || 'http://localhost:8088' },
] as const;

const dataProbeRegistry = [
  { key: 'builders', label: 'Builders', table: 'builders' },
  { key: 'projects', label: 'Projects', table: 'projects' },
  { key: 'leads', label: 'Leads', table: 'leads' },
  { key: 'residents', label: 'Residents', table: 'residents' },
  { key: 'whatsapp_messages', label: 'WhatsApp Messages', table: 'whatsapp_messages' },
  { key: 'agent_dispatch_queue', label: 'Dispatch Queue', table: 'agent_dispatch_queue' },
] as const;

function hasValue(key: string) {
  return Boolean(env[key]?.trim());
}

function buildEnvGroup(key: string, label: string, required: string[], partial: string[] = []): EnvGroup {
  const missingRequired = required.filter((name) => !hasValue(name));
  const missingPartial = partial.filter((name) => !hasValue(name));
  const missing = [...missingRequired, ...missingPartial];

  if (!required.length) {
    return { key, label, status: 'manual', detail: 'Manual verification required.', required, missing };
  }

  if (!missingRequired.length && !missingPartial.length) {
    return { key, label, status: 'ready', detail: 'All required values are present.', required, missing };
  }

  if (!missingRequired.length) {
    return {
      key,
      label,
      status: 'partial',
      detail: `Core values present. Optional values missing: ${missingPartial.join(', ')}.`,
      required,
      missing,
    };
  }

  return {
    key,
    label,
    status: 'blocked',
    detail: `Missing required values: ${missingRequired.join(', ')}.`,
    required,
    missing,
  };
}

async function fetchJson(url: string) {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2_500),
    });
    const text = await response.text();
    const data = text ? safeJson(text) : null;
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: null,
      data: { error: error instanceof Error ? error.message : 'unreachable' },
    };
  }
}

function safeJson(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function statusFromHealth(healthOk: boolean, dependencyOk: boolean) {
  if (healthOk && dependencyOk) return 'ready';
  if (healthOk) return 'partial';
  return 'blocked';
}

function inferDependencyOk(key: string, payload: unknown) {
  const data = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};

  switch (key) {
    case 'summoner': {
      const checks = (data.checks && typeof data.checks === 'object') ? data.checks as Record<string, { ok?: boolean }> : {};
      const allChecksOk = Object.values(checks).every((item) => item?.ok !== false);
      return Boolean(data.supabase) && Boolean(data.orchestration) && allChecksOk;
    }
    case 'sales': {
      const checks = (data.checks && typeof data.checks === 'object') ? data.checks as Record<string, unknown> : {};
      const supabaseConfigured = Boolean((checks.supabase as { configured?: boolean } | undefined)?.configured);
      return supabaseConfigured;
    }
    case 'content':
      return Boolean(data.supabase) && data.tool_gateway_ping === 'ok';
    case 'ads':
      return Boolean(data.supabase);
    case 'ghost_closer':
      return Boolean(data.supabase) && Boolean(data.tool_gateway);
    case 'colony':
      return Boolean(data.supabase) && Boolean(data.tool_gateway);
    case 'finance':
      return Boolean(data.supabase);
    case 'tool_gateway':
      return true;
    default:
      return false;
  }
}

function serviceDetail(key: string, health: unknown, dependencies: unknown, healthOk: boolean) {
  if (!healthOk) return 'Service health endpoint is unreachable.';

  const dep = (dependencies && typeof dependencies === 'object') ? dependencies as Record<string, unknown> : {};

  switch (key) {
    case 'summoner': {
      const checks = (dep.checks && typeof dep.checks === 'object') ? dep.checks as Record<string, { ok?: boolean }> : {};
      const down = Object.entries(checks)
        .filter(([, value]) => value?.ok === false)
        .map(([name]) => name);
      return down.length
        ? `Reachable, but downstream services are failing: ${down.join(', ')}.`
        : 'Reachable with downstream agent health checks responding.';
    }
    case 'sales': {
      const checks = (dep.checks && typeof dep.checks === 'object') ? dep.checks as Record<string, unknown> : {};
      const whatsapp = checks.whatsapp_cloud_api as { configured?: boolean; check?: { ok?: boolean; reason?: string } } | undefined;
      if (whatsapp?.configured && whatsapp?.check?.ok) return 'Reachable with live WhatsApp Graph API check passing.';
      if (whatsapp?.configured) return `Reachable, but WhatsApp Graph check is not passing${whatsapp.check?.reason ? `: ${whatsapp.check.reason}` : '.'}`;
      return 'Reachable, but WhatsApp Cloud API credentials are incomplete.';
    }
    case 'finance':
      return Boolean(dep.razorpay)
        ? 'Reachable with Razorpay webhook secret configured.'
        : 'Reachable, but Razorpay webhook secret is missing.';
    case 'tool_gateway':
      return Boolean(dep.whatsapp) || Boolean(dep.meta) || Boolean(dep.higgsfield)
        ? 'Reachable with at least one external execution path configured.'
        : 'Reachable, but external execution credentials are mostly missing.';
    default:
      return 'Reachable and reporting dependencies.';
  }
}

async function getServiceStates(): Promise<ServiceState[]> {
  return Promise.all(
    serviceRegistry.map(async (service) => {
      const configured = Boolean(service.url);
      if (!configured) {
        return {
          key: service.key,
          label: service.label,
          url: service.url,
          configured,
          reachable: false,
          status: 'blocked',
          detail: 'Service URL is not configured.',
          health: null,
          dependencies: null,
        };
      }

      const [health, dependencies] = await Promise.all([
        fetchJson(`${service.url}/health`),
        fetchJson(`${service.url}/health/dependencies`),
      ]);
      const dependencyOk = inferDependencyOk(service.key, dependencies.data);
      const status = statusFromHealth(health.ok, dependencyOk);

      return {
        key: service.key,
        label: service.label,
        url: service.url,
        configured,
        reachable: health.ok,
        status,
        detail: serviceDetail(service.key, health.data, dependencies.data, health.ok),
        health: health.data,
        dependencies: dependencies.data,
      };
    }),
  );
}

async function getDataProbes(): Promise<DataProbe[]> {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return dataProbeRegistry.map((probe) => ({
      key: probe.key,
      label: probe.label,
      status: 'blocked',
      detail: 'Service-role Supabase client is not configured in dashboard env.',
      count: null,
    }));
  }

  return Promise.all(
    dataProbeRegistry.map(async (probe) => {
      try {
        const { count, error } = await supabase
          .from(probe.table)
          .select('id', { head: true, count: 'exact' });

        if (error) {
          return {
            key: probe.key,
            label: probe.label,
            status: 'blocked',
            detail: error.message,
            count: null,
          };
        }

        const total = count ?? 0;
        return {
          key: probe.key,
          label: probe.label,
          status: 'ready',
          detail: `${total} record${total === 1 ? '' : 's'} accessible.`,
          count: total,
        };
      } catch (error) {
        return {
          key: probe.key,
          label: probe.label,
          status: 'blocked',
          detail: error instanceof Error ? error.message : 'Supabase probe failed.',
          count: null,
        };
      }
    }),
  );
}

function buildLaunchGates({
  envGroups,
  services,
  dataProbes,
}: {
  envGroups: EnvGroup[];
  services: ServiceState[];
  dataProbes: DataProbe[];
}): LaunchGate[] {
  const envByKey = Object.fromEntries(envGroups.map((group) => [group.key, group]));
  const serviceByKey = Object.fromEntries(services.map((service) => [service.key, service]));
  const probeByKey = Object.fromEntries(dataProbes.map((probe) => [probe.key, probe]));

  const supabaseReady =
    envByKey.supabase_client?.status !== 'blocked' &&
    envByKey.supabase_service?.status !== 'blocked' &&
    probeByKey.builders?.status === 'ready' &&
    probeByKey.projects?.status === 'ready';

  const summonerReady =
    serviceByKey.summoner?.status === 'ready' &&
    envByKey.whatsapp_ingress?.status !== 'blocked' &&
    envByKey.default_context?.status !== 'blocked';

  const financePathReady =
    serviceByKey.finance?.reachable &&
    envByKey.razorpay?.status !== 'blocked';

  const colonyReady =
    serviceByKey.colony?.reachable &&
    serviceByKey.tool_gateway?.reachable &&
    envByKey.whatsapp_ingress?.status !== 'blocked';

  const queueProofReady =
    serviceByKey.summoner?.status === 'ready' &&
    probeByKey.agent_dispatch_queue?.status === 'ready';

  const liveDashboardReady =
    probeByKey.leads?.status === 'ready' &&
    probeByKey.residents?.status === 'ready';

  return [
    {
      key: 'supabase_live',
      label: 'Live Supabase Connection',
      status: supabaseReady ? 'ready' : 'blocked',
      detail: supabaseReady
        ? 'Dashboard can reach live tables with service-role access.'
        : 'Supabase env or table probes are still failing.',
    },
    {
      key: 'summoner_ingress',
      label: 'Summoner-First WhatsApp Ingress',
      status: summonerReady ? 'manual' : 'blocked',
      detail: summonerReady
        ? 'Config and health are present. Still needs one public webhook proof.'
        : 'Summoner health, default context, or WhatsApp env is incomplete.',
    },
    {
      key: 'queue_cron',
      label: 'Queue and Cron Path',
      status: queueProofReady ? 'manual' : 'blocked',
      detail: queueProofReady
        ? 'Queue table and Summoner health are in place. Still needs a real execution proof.'
        : 'Summoner orchestration path or queue table access is not ready.',
    },
    {
      key: 'finance_receipts',
      label: 'Finance and Razorpay Path',
      status: financePathReady ? 'manual' : 'blocked',
      detail: financePathReady
        ? 'Finance service is reachable with Razorpay env present. Still needs a signed test webhook proof.'
        : 'Finance service or Razorpay configuration is incomplete.',
    },
    {
      key: 'colony_notifications',
      label: 'Colony Notices and Reminders',
      status: colonyReady ? 'manual' : 'blocked',
      detail: colonyReady
        ? 'Colony and tool-gateway are reachable. Still needs one outbound notification proof.'
        : 'Colony execution path is not fully ready.',
    },
    {
      key: 'dashboard_live_data',
      label: 'Dashboard on Live Data',
      status: liveDashboardReady ? 'ready' : 'blocked',
      detail: liveDashboardReady
        ? 'Core tables for sales and colony surfaces are queryable from the dashboard.'
        : 'Lead or resident data probes are still failing, so live UI proof is weak.',
    },
  ];
}

export async function getOpsReadiness(): Promise<OpsReadiness> {
  const envGroups: EnvGroup[] = [
    buildEnvGroup('supabase_client', 'Supabase Client', [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]),
    buildEnvGroup('supabase_service', 'Supabase Service Role', [
      'SUPABASE_SERVICE_ROLE_KEY',
    ]),
    buildEnvGroup('default_context', 'Default Builder Context', [
      'DEFAULT_BUILDER_ID',
      'DEFAULT_PROJECT_ID',
    ]),
    buildEnvGroup('whatsapp_ingress', 'WhatsApp Ingress', [
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_VERIFY_TOKEN',
      'META_APP_SECRET',
    ], [
      'WHATSAPP_GRAPH_VERSION',
    ]),
    buildEnvGroup('meta_ads', 'Meta Ads', [
      'META_ACCESS_TOKEN',
      'META_AD_ACCOUNT_ID',
    ]),
    buildEnvGroup('razorpay', 'Razorpay', [
      'NEXT_PUBLIC_RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
    ]),
    buildEnvGroup('openai', 'OpenAI', [
      'OPENAI_API_KEY',
    ]),
    buildEnvGroup('media', 'Render and Media', [
      'REMOTION_MODE',
    ], [
      'HIGGSFIELD_API_KEY',
      'REMOTION_SERVE_URL',
      'REMOTION_LAMBDA_FN',
    ]),
  ];

  const [services, dataProbes] = await Promise.all([
    getServiceStates(),
    getDataProbes(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    envGroups,
    services,
    dataProbes,
    launchGates: buildLaunchGates({ envGroups, services, dataProbes }),
  };
}
