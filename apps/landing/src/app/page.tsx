import type { Metadata } from 'next';
import {
  ArrowRight,
  Check,
  Clock3,
  MessageCircle,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const dashboardHref = 'https://x7-whatsai-dashboard.vercel.app';

export const metadata: Metadata = {
  title: 'WhatsAI Assistant | WhatsApp AI Receptionist',
  description:
    'WhatsAI Assistant replies to WhatsApp inquiries 24/7, qualifies leads, books appointments, and alerts Indian SMB owners for hot leads.',
};

const phoneMessages = [
  { side: 'customer', text: 'Hi, clinic appointment available today?' },
  { side: 'ai', text: 'Yes. Which doctor do you want to meet?' },
  { side: 'customer', text: 'Dentist. Evening slot chahiye.' },
  { side: 'ai', text: 'I can hold 6:30 PM or 7:15 PM. Which one works?' },
  { side: 'customer', text: '7:15 PM' },
  { side: 'ai', text: 'Booked. Please share your name. The clinic team will get your details.' },
];

const painPoints = [
  {
    icon: Moon,
    title: '11PM message. No reply.',
    text: "You're asleep. The customer finds another clinic, coaching class, salon, or broker by morning.",
  },
  {
    icon: Clock3,
    title: 'Meeting ke beech five inquiries.',
    text: 'Your phone keeps buzzing. No one answers fast enough. High-intent leads move on.',
  },
  {
    icon: Users,
    title: 'Follow-up depends on staff memory.',
    text: 'A hot lead asked for price, timing, or appointment. Nobody follows up. The lead goes cold.',
  },
];

const steps = [
  {
    title: 'Customer messages your WhatsApp number.',
    text: 'They ask about fees, slots, price, location, availability, or service details.',
  },
  {
    title: 'WhatsAI replies and qualifies them.',
    text: 'It asks the right questions, books an appointment, and pauses for human takeover when needed.',
  },
  {
    title: 'You see qualified leads in one dashboard.',
    text: 'Wake up to booked appointments, hot leads, notes, and the exact chat history.',
  },
];

const features = [
  { emoji: '🤖', title: '24/7 AI Receptionist', text: 'Replies in seconds when you, your staff, or your front desk are busy.' },
  { emoji: '📋', title: 'Smart Lead Qualification', text: 'Collects need, budget, timeline, location, and urgency before you speak.' },
  { emoji: '📅', title: 'Appointment Booking', text: 'Suggests slots and logs confirmed visits or appointments to the dashboard.' },
  { emoji: '🔔', title: 'Hot Lead Alerts', text: 'Flags urgent buyers, patients, students, and customers for human takeover.' },
  { emoji: '📊', title: 'Owner Dashboard', text: 'Shows conversations, lead status, appointment status, and follow-up notes.' },
  { emoji: '🏢', title: 'Works for Any Business', text: 'Built for clinics, coaching classes, restaurants, gyms, salons, and brokers.' },
];

const useCases = [
  {
    name: 'Coaching Institute',
    quote: '100+ student inquiries handled per month without a single human reply.',
    detail: 'Course fit, fees, batch timing, and demo-class interest captured automatically.',
  },
  {
    name: 'Dental Clinic',
    quote: 'Appointment booking rate went up 3x in the first week.',
    detail: 'The AI checks preferred time, urgency, and patient name before handoff.',
  },
  {
    name: 'Real Estate Agent',
    quote: 'AI qualifies site visit leads for me every night.',
    detail: 'Budget, area, timeline, and visit intent reach the owner before the call.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-[#1a1f2e]">
      <HeroSection />
      <PainSection />
      <HowItWorksSection />
      <FeaturesSection />
      <UseCasesSection />
      <PricingSection />
      <FinalCtaSection />
      <Footer />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative bg-[#1a1f2e] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,168,132,0.38),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(217,253,211,0.15),transparent_30%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,#ffffff_1px,transparent_1px),linear-gradient(#ffffff_1px,transparent_1px)] [background-size:42px_42px]" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label="WhatsAI Assistant home">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00a884] text-white shadow-lg shadow-[#00a884]/25">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="text-sm font-black tracking-tight sm:text-base">WhatsAI Assistant</span>
        </a>
        <div className="hidden items-center gap-6 text-sm font-semibold text-white/72 md:flex">
          <a className="transition hover:text-white" href="#how">How it works</a>
          <a className="transition hover:text-white" href="#features">Features</a>
          <a className="transition hover:text-white" href="#pricing">Pricing</a>
        </div>
        <a
          href={dashboardHref}
          className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#075e54] transition hover:bg-[#d9fdd3] focus:outline-none focus:ring-4 focus:ring-[#00a884]/40"
        >
          Start Free Trial
        </a>
      </nav>

      <div id="top" className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:min-h-[760px] lg:grid-cols-[1fr_440px] lg:items-center lg:pb-24 lg:pt-16">
        <div className="max-w-3xl animate-[fadeUp_.7s_ease-out_both]">
          <p className="inline-flex rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-bold text-[#d9fdd3] backdrop-blur">
            For Indian SMB owners who live on WhatsApp
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Never Miss WhatsApp Leads
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75 sm:text-xl">
            A WhatsApp AI receptionist for clinics, coaching classes, salons, gyms, restaurants, and brokers. It replies, qualifies, books appointments, and alerts you for hot leads.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={dashboardHref}
              className="group inline-flex items-center justify-center rounded-full bg-[#00a884] px-7 py-4 text-sm font-black text-white shadow-2xl shadow-[#00a884]/25 transition hover:-translate-y-0.5 hover:shadow-[#00a884]/40 focus:outline-none focus:ring-4 focus:ring-[#00a884]/40"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-4 text-sm font-black text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-sm font-semibold text-white/70">
            Setup in 10 minutes. No credit card needed. Works on your existing WhatsApp number.
          </p>
        </div>

        <div className="animate-[fadeUp_.7s_.12s_ease-out_both]">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="mx-auto max-w-[390px] rounded-[2.25rem] border border-white/15 bg-[#0b111d] p-3 shadow-[0_32px_90px_rgba(0,0,0,0.42)]">
      <div className="overflow-hidden rounded-[1.75rem] bg-[#efeae2]">
        <div className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-sm font-black">WA</div>
            <div>
              <p className="text-sm font-black">Your AI Receptionist</p>
              <p className="text-xs text-white/70">online now</p>
            </div>
          </div>
          <ShieldCheck className="h-5 w-5 text-[#d9fdd3]" />
        </div>
        <div className="space-y-3 px-3 py-4">
          {phoneMessages.map((message, index) => (
            <ChatBubble key={`${message.text}-${index}`} side={message.side} text={message.text} />
          ))}
          <div className="rounded-2xl border border-[#00a884]/20 bg-white px-4 py-3 text-xs font-bold text-[#075e54] shadow-sm">
            Hot lead alert sent to owner
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-black/10 bg-[#f7f8f6] p-3">
          <div className="flex-1 rounded-full bg-white px-4 py-2 text-sm text-slate-500 shadow-inner">Message</div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Send className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PainSection() {
  return (
    <section className="bg-[#0f172a] px-5 py-16 text-white sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#00a884]">Iska Matlab Pehchaano</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Leads do not wait for office hours.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {painPoints.map((item) => (
            <article key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/10 backdrop-blur">
              <item.icon className="h-8 w-8 text-[#d9fdd3]" />
              <h3 className="mt-8 text-xl font-black">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/70">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how" className="px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="How it works" title="Three steps from inquiry to appointment." text="WhatsAI sits on top of your WhatsApp workflow. Customers chat like normal. You get clean lead data." />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="relative rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d9fdd3] text-lg font-black text-[#075e54]">{index + 1}</div>
              <h3 className="mt-8 text-xl font-black tracking-tight">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.text}</p>
              {index < steps.length - 1 && <ArrowRight className="absolute -right-4 top-1/2 hidden h-8 w-8 text-[#00a884] lg:block" />}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-white px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Kya Milta Hai" title="The front desk your business needed." text="Six simple tools cover the customer journey from first message to owner handoff." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="group rounded-[2rem] border border-slate-200 bg-[#f8fafc] p-6 transition hover:-translate-y-1 hover:border-[#00a884]/40 hover:bg-white hover:shadow-xl hover:shadow-[#00a884]/10">
              <div className="text-3xl" aria-hidden="true">{feature.emoji}</div>
              <h3 className="mt-6 text-xl font-black tracking-tight">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section className="px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Use cases" title="Built for businesses that run on calls and WhatsApp." text="Start with one WhatsApp number. Train the assistant on your offer, your questions, and your booking rules." />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <article key={useCase.name} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#00a884]">{useCase.name}</p>
              <blockquote className="mt-6 text-2xl font-black leading-tight tracking-tight text-[#1a1f2e]">
                “{useCase.quote}”
              </blockquote>
              <p className="mt-5 text-sm leading-6 text-slate-600">{useCase.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="bg-[#edf7f4] px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#075e54]">Shuruaat Karo</p>
        <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">10-Business Free Trial</h2>
        <div className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-[#00a884]/20 bg-white p-7 text-left shadow-2xl shadow-[#00a884]/10 sm:p-9">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-2xl font-black">Pilot access</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">One WhatsApp number. One business. Full lead-to-appointment workflow.</p>
            </div>
            <div className="rounded-full bg-[#d9fdd3] px-4 py-2 text-sm font-black text-[#075e54]">Free</div>
          </div>
          <ul className="mt-8 space-y-4 text-sm font-semibold text-slate-700">
            {['Unlimited WhatsApp replies', 'Lead dashboard', 'Hot lead alerts', '1 WhatsApp number'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="h-5 w-5 rounded-full bg-[#00a884] p-1 text-white" />
                {item}
              </li>
            ))}
          </ul>
          <a
            href={dashboardHref}
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#00a884] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00a884]/25 focus:outline-none focus:ring-4 focus:ring-[#00a884]/30"
          >
            Claim Your Free Spot
          </a>
          <p className="mt-4 text-center text-sm font-semibold text-slate-500">Limited to 10 businesses in the pilot. No credit card required.</p>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="bg-[#1a1f2e] px-5 py-16 text-white sm:px-8 lg:py-24">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-[#d9fdd3]">
          <Sparkles className="h-4 w-4" /> Pilot onboarding is open
        </p>
        <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Aapka WhatsApp 24/7 Kaam Karega.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/72">Set up in 10 minutes. Your AI receptionist is waiting.</p>
        <a
          href={dashboardHref}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[#00a884] px-8 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#00a884]/30 focus:outline-none focus:ring-4 focus:ring-[#00a884]/40"
        >
          Start Free Now <ArrowRight className="ml-2 h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-slate-200 pt-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black text-[#1a1f2e]">WhatsAI Assistant</p>
          <p className="mt-1">© 2026 WhatsAI. Made for Indian SMBs.</p>
        </div>
        <div className="flex flex-wrap gap-5 font-semibold">
          <a className="transition hover:text-[#075e54]" href={dashboardHref}>Dashboard</a>
          <a className="transition hover:text-[#075e54]" href="/privacy">Privacy</a>
          <a className="transition hover:text-[#075e54]" href="mailto:rohit@xeroseven.in">Contact</a>
        </div>
      </div>
    </footer>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#00a884]">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-[#1a1f2e] sm:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{text}</p>
    </div>
  );
}

function ChatBubble({ side, text }: { side: string; text: string }) {
  const customer = side === 'customer';
  return (
    <div className={`flex ${customer ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${customer ? 'rounded-tl-sm bg-white text-[#1a1f2e]' : 'rounded-tr-sm bg-[#d9fdd3] text-[#1a1f2e]'}`}>
        {text}
      </div>
    </div>
  );
}
