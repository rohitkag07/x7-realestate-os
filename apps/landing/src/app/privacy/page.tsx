import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for WhatsAI Assistant.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f3] px-5 py-12 text-[#101916] sm:py-20">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-[#dce3df] bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-[#07866f]">Back to WhatsAI Assistant</Link>
        <h1 className="mt-8 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[#68746f]">Effective 19 July 2026</p>

        <div className="mt-10 space-y-8 text-base leading-7 text-[#52605a]">
          <section>
            <h2 className="text-xl font-semibold text-[#101916]">What WhatsAI processes</h2>
            <p className="mt-2">WhatsAI Assistant helps a business send configured WhatsApp replies, capture leads, organise conversations, coordinate appointments, and identify chats that need human attention.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-[#101916]">Information collected</h2>
            <p className="mt-2">Depending on the business workflow, we may process customer name, phone number, WhatsApp messages, lead status, configured qualification answers, appointment details, internal notes, and message delivery identifiers.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-[#101916]">How information is used</h2>
            <p className="mt-2">Information is used to route a message to the correct business, send the business-approved response, show the conversation to authorised operators, maintain message history, prevent duplicate processing, and provide support.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-[#101916]">Service providers</h2>
            <p className="mt-2">The service relies on infrastructure providers such as Meta WhatsApp Cloud API, hosting, and database services. We do not sell personal data. Providers process data only as required to operate the product.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-[#101916]">Data requests</h2>
            <p className="mt-2">Customers can request access, correction, or deletion through the business they contacted. Business owners can contact WhatsAI for support with a valid request.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-[#101916]">Contact</h2>
            <p className="mt-2">Privacy questions can be sent to <a className="font-semibold text-[#07866f]" href="mailto:rohit@xeroseven.in">rohit@xeroseven.in</a>.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
