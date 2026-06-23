import { CheckCircle2 } from 'lucide-react';
import type { LandingProject } from '@/lib/types';
export function AmenitiesSection({ project }: { project: LandingProject }) {
  if (!project.amenities?.length) return null;
  return (
    <section id="amenities" className="py-20 px-6 lg:px-12 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-10">Amenities</h2>
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {project.amenities.map((a) => <li key={a} className="flex items-center gap-3 rounded-lg bg-white border p-4"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /><span className="font-medium">{a}</span></li>)}
        </ul>
      </div>
    </section>
  );
}
