import Link from 'next/link';
import { MessageCircle, MapPin } from 'lucide-react';
import type { LandingProject, LandingBuilder } from '@/lib/types';
export function Hero({ project, builder, heroImageUrl }: { project: LandingProject; builder: LandingBuilder; heroImageUrl?: string | null }) {
  const accent = builder.brand_colors?.accent ?? '#F59E0B', primary = builder.brand_colors?.primary ?? '#0F172A';
  const wa = builder.whatsapp_number?.replace(/[^\d]/g, '');
  return (
    <section className="relative min-h-[88vh] flex flex-col text-white overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {heroImageUrl ? <img src={heroImageUrl} alt={project.name} className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.35), rgba(15,23,42,0.85))' }} />
      </div>
      <nav className="px-6 py-5 lg:px-12 flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide">{builder.company_name}</div>
        <Link href={`https://wa.me/${wa}`} className="rounded-full px-4 py-2 text-sm font-medium" style={{ background: accent, color: primary }}>WhatsApp</Link>
      </nav>
      <div className="flex-1 flex items-center px-6 lg:px-12 pb-20">
        <div className="max-w-3xl">
          {project.rera_number && <div className="inline-block mb-6 px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-200 text-xs font-medium border border-emerald-500/30">Verified offer · {project.rera_number}</div>}
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">{project.name}</h1>
          <p className="mt-3 text-xl flex items-center gap-2 text-white/85"><MapPin className="h-5 w-5" /> {project.location}</p>
          {project.description && <p className="mt-6 text-lg text-white/80 max-w-2xl leading-relaxed">{project.description}</p>}
          <div className="mt-8 inline-block px-6 py-4 rounded-xl" style={{ background: accent, color: primary }}>
            <div className="text-xs uppercase tracking-widest opacity-70 font-semibold">Starting from</div>
            <div className="text-4xl font-black mt-1">₹{project.price_range_min ?? '—'} Lakh</div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`https://wa.me/${wa}`} className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-semibold" style={{ background: accent, color: primary }}><MessageCircle className="h-5 w-5" /> Ask on WhatsApp</Link>
            <a href="#pricing" className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-semibold bg-white/10 hover:bg-white/20 border border-white/20">See Offer</a>
          </div>
        </div>
      </div>
    </section>
  );
}
