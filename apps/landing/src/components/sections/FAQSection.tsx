export function FAQSection({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  if (!faqs?.length) return null;
  return (
    <section id="faqs" className="py-20 px-6 lg:px-12 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
        <dl className="divide-y divide-slate-200 rounded-xl border bg-white">
          {faqs.map((f, i) => (
            <details key={i} className="group p-5">
              <summary className="cursor-pointer flex items-center justify-between font-medium">{f.q}<span className="text-slate-400 group-open:rotate-45 transition-transform">+</span></summary>
              <dd className="mt-3 text-slate-600 leading-relaxed">{f.a}</dd>
            </details>
          ))}
        </dl>
      </div>
    </section>
  );
}
