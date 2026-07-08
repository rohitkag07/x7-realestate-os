import { APP_NAME, APP_TAGLINE, APP_COPYRIGHT } from '@/lib/constants';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Marketing rail */}
      <aside className="hidden lg:flex flex-1 flex-col justify-between bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-12 text-white">
        <div>
          <div className="text-2xl font-bold">{APP_NAME}</div>
          <div className="text-sm text-white/70 mt-1">{APP_TAGLINE}</div>
        </div>

        <div className="space-y-5 max-w-md">
          <p className="text-2xl font-semibold leading-snug">
            &ldquo;Har Indian SMB ke WhatsApp par 24/7 receptionist — leads qualify, appointments book, hot enquiries owner ko handoff.&rdquo;
          </p>
          <p className="text-sm text-white/70">
            Start with a managed 7-day WhatsApp assistant trial. Keep the dashboard simple: conversations, qualification, handoffs, and daily summaries.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Instant WhatsApp replies for missed enquiries</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Vertical playbooks for clinics, coaching, gyms, services, and real estate</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Hot-lead handoff alerts for the owner</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Daily summary of conversations and follow-ups</li>
          </ul>
        </div>

        <div className="text-xs text-white/50">{APP_COPYRIGHT} · WhatsAI Trial OS</div>
      </aside>

      {/* Form rail */}
      <main className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
