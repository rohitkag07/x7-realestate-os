export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for WhatsAI Assistant',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-12 text-[#1b2a29]">
      <article className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/10 md:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0d7d67]">WhatsAI Assistant</p>
        <h1 className="mt-3 text-3xl font-black">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#52615f]">Last updated: July 9, 2026</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-[#33413f]">
          <p>
            WhatsAI Assistant helps businesses respond to customer enquiries on WhatsApp, qualify leads,
            book appointments, and notify business owners when a conversation needs human attention.
          </p>
          <p>
            We collect only the information needed to operate the assistant, such as customer name, phone
            number, WhatsApp messages, lead qualification answers, appointment intent, and handoff notes.
          </p>
          <p>
            We use this information to reply to customer messages, route enquiries to the right business,
            improve conversation quality, prevent abuse, and provide support to the business owner.
          </p>
          <p>
            We do not sell personal data. Data may be processed by service providers required to run the
            product, including hosting, database, analytics, and WhatsApp Cloud API infrastructure.
          </p>
          <p>
            Customers can request access, correction, or deletion of their data by contacting the business
            owner or the WhatsAI team.
          </p>
          <p>
            Contact: <a className="font-bold text-[#0d7d67]" href="mailto:rohit@xeroseven.in">rohit@xeroseven.in</a>
          </p>
        </section>
      </article>
    </main>
  );
}
