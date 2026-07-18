import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms for using WhatsAI Assistant.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f3] px-5 py-12 text-[#101916] sm:py-20">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-[#dce3df] bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-[#07866f]">Back to WhatsAI Assistant</Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-[#68746f]">Effective 19 July 2026</p>
        <div className="mt-10 space-y-8 text-base leading-7 text-[#52605a]">
          <section><h2 className="text-xl font-semibold text-[#101916]">Service</h2><p className="mt-2">WhatsAI Assistant helps businesses configure approved WhatsApp replies, capture leads, share supported media, track conversations, and coordinate appointments or human handoffs.</p></section>
          <section><h2 className="text-xl font-semibold text-[#101916]">Business responsibility</h2><p className="mt-2">The business owner is responsible for the accuracy, legality, and currency of all configured replies, media, offers, and customer communication. WhatsAI does not provide legal, medical, or financial advice.</p></section>
          <section><h2 className="text-xl font-semibold text-[#101916]">WhatsApp and Meta</h2><p className="mt-2">Use of WhatsApp Cloud API remains subject to Meta’s terms, messaging policies, template rules, and conversation charges. Meta services may change independently of WhatsAI.</p></section>
          <section><h2 className="text-xl font-semibold text-[#101916]">Payments and cancellation</h2><p className="mt-2">Setup scope, monthly service, applicable third-party fees, and cancellation terms are confirmed in writing before activation. Services already delivered are not automatically refundable.</p></section>
          <section><h2 className="text-xl font-semibold text-[#101916]">Availability</h2><p className="mt-2">We work to keep the service available but do not promise uninterrupted delivery where Meta, hosting, connectivity, or other third-party systems are unavailable.</p></section>
          <section><h2 className="text-xl font-semibold text-[#101916]">Contact</h2><p className="mt-2">Questions can be sent to <a className="font-semibold text-[#07866f]" href="mailto:rohit@xeroseven.in">rohit@xeroseven.in</a>.</p></section>
        </div>
      </article>
    </main>
  );
}
