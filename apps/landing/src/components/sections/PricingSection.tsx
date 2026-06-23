import type { LandingProject, LandingBuilder } from '@/lib/types';
export function PricingSection({ project, builder }: { project: LandingProject; builder: LandingBuilder }) {
  const accent = builder.brand_colors?.accent ?? '#F59E0B', primary = builder.brand_colors?.primary ?? '#0F172A';
  return (
    <section id="pricing" className="py-20 px-6 lg:px-12 bg-slate-50">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-2">Pricing</h2>
        <p className="text-slate-600 mb-10">RERA-approved · Direct from builder · No brokerage</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 p-8" style={{ borderColor: accent }}>
            <div className="text-xs uppercase tracking-widest text-slate-500">Starting from</div>
            <div className="text-5xl font-black mt-2" style={{ color: primary }}>₹{project.price_range_min ?? '—'} L</div>
            <p className="text-sm text-slate-600 mt-3">Plots of 1,000–1,500 sqft. RERA approved.</p>
          </div>
          <div className="rounded-2xl border p-8">
            <div className="text-xs uppercase tracking-widest text-slate-500">Inventory</div>
            <div className="text-5xl font-black mt-2 text-slate-800">{project.available_plots}/{project.total_plots}</div>
            <p className="text-sm text-slate-600 mt-3">Plots available right now.</p>
          </div>
        </div>
        <a href="#booking" className="inline-block mt-10 rounded-full px-8 py-4 font-semibold" style={{ background: accent, color: primary }}>Request Detailed Price List</a>
      </div>
    </section>
  );
}
