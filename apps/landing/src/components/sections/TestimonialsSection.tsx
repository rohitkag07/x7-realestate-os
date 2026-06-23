import { Star } from 'lucide-react';
export function TestimonialsSection({ testimonials }: { testimonials: Array<{ name: string; city: string; occupation?: string; quote: string; rating?: number }> }) {
  if (!testimonials?.length) return null;
  return (
    <section id="testimonials" className="py-20 px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-10">Buyers Share Their Story</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <article key={i} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-0.5 text-amber-500 mb-3">{Array.from({ length: t.rating ?? 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-amber-500" />)}</div>
              <blockquote className="text-slate-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
              <div className="mt-4 text-sm"><div className="font-semibold">{t.name}</div><div className="text-slate-500">{t.occupation && `${t.occupation} · `}{t.city}</div></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
