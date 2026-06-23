import { APP_NAME, APP_TAGLINE, APP_COPYRIGHT } from '@/lib/constants';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Marketing rail */}
      <aside className="hidden lg:flex flex-1 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 p-12 text-white">
        <div>
          <div className="text-2xl font-bold">{APP_NAME}</div>
          <div className="text-sm text-white/70 mt-1">{APP_TAGLINE}</div>
        </div>

        <div className="space-y-5 max-w-md">
          <p className="text-2xl font-semibold leading-snug">
            &ldquo;Tier 2 builder ka ₹50 Lakh marketing budget — ab AI agents handle karte hain.&rdquo;
          </p>
          <p className="text-sm text-white/70">
            60+ posts a month, WhatsApp sales agent, lead-to-booking automation, colony management — one platform.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> 60+ social posts auto-generated per month</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> WhatsApp sales agent that responds in 3 seconds</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Meta Ads autopilot — daily budget reallocation</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Colony management for life after handover</li>
          </ul>
        </div>

        <div className="text-xs text-white/50">{APP_COPYRIGHT} · Project NEEV</div>
      </aside>

      {/* Form rail */}
      <main className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
