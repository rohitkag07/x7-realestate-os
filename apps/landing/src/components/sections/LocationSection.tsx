import { MapPin } from 'lucide-react';
import type { LandingProject } from '@/lib/types';
export function LocationSection({ project }: { project: LandingProject }) {
  const map = project.latitude && project.longitude ? `https://maps.google.com/maps?q=${project.latitude},${project.longitude}&z=14&output=embed` : null;
  return (
    <section id="location" className="py-20 px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Prime Location</h2>
        <p className="text-slate-600 mb-10">{project.location}, {project.city}</p>
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="rounded-xl overflow-hidden border aspect-[4/3] bg-slate-100">
            {map ? <iframe src={map} className="w-full h-full" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><MapPin className="h-12 w-12" /></div>}
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Nearby</h3>
            <ul className="space-y-3">
              {(project.nearby_landmarks ?? []).map((l) => (
                <li key={l.name} className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div><div className="font-medium">{l.name}</div><div className="text-xs text-slate-500 capitalize">{l.type}</div></div>
                  <div className="font-bold text-amber-600">{l.distance_km} km</div>
                </li>
              ))}
              {(project.nearby_landmarks ?? []).length === 0 && <li className="text-slate-500">Landmark data coming soon.</li>}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
