'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarCheck2,
  Check,
  CircleCheck,
  FileText,
  HeartHandshake,
  Image as ImageIcon,
  LockKeyhole,
  Menu,
  MessageCircle,
  MessagesSquare,
  MousePointerClick,
  PauseCircle,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Store,
  UserRoundCheck,
  UsersRound,
  Video,
  X,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const dashboardHref = 'https://x7-whatsai-dashboard.vercel.app/dashboard';
const setupMessage = encodeURIComponent(
  'Hi Rohit, I want to set up WhatsAI Assistant for my business. Please show me the live workflow.',
);
const setupHref = `https://wa.me/917869161842?text=${setupMessage}`;

const navItems = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#workflow' },
  { label: 'For your business', href: '#industries' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Security', href: '#control' },
];

type Outcome = {
  title: string;
  text: string;
  icon: LucideIcon;
  className: string;
  visual: 'rules' | 'lead' | 'takeover' | 'media' | 'calendar';
};

const outcomes: Outcome[] = [
  {
    title: 'Your approved answers. Every time.',
    text: 'Set the questions your customers ask and the exact answer WhatsAI should send.',
    icon: ShieldCheck,
    className: 'md:col-span-7',
    visual: 'rules',
  },
  {
    title: 'Every enquiry becomes a lead.',
    text: 'Name, phone, conversation, stage, and next action stay together.',
    icon: UserRoundCheck,
    className: 'md:col-span-5',
    visual: 'lead',
  },
  {
    title: 'Take over in one tap.',
    text: 'Pause automation when a conversation needs a human.',
    icon: PauseCircle,
    className: 'md:col-span-4',
    visual: 'takeover',
  },
  {
    title: 'Send the proof customers ask for.',
    text: 'Attach an image, MP4 video, or PDF to any approved reply.',
    icon: FileText,
    className: 'md:col-span-4',
    visual: 'media',
  },
  {
    title: 'Appointments arrive organised.',
    text: 'Configured booking conversations are recorded in one calendar.',
    icon: CalendarCheck2,
    className: 'md:col-span-4',
    visual: 'calendar',
  },
];

const workflow = [
  {
    step: '01',
    title: 'A customer asks naturally',
    text: 'Hindi, English, Hinglish, and common spelling variations are matched against your business rules.',
    visual: <CustomerQuestion />,
  },
  {
    step: '02',
    title: 'WhatsAI finds the approved rule',
    text: 'The system identifies the closest configured intent without generating a new or unpredictable answer.',
    visual: <RuleMatch />,
  },
  {
    step: '03',
    title: 'The exact reply is sent',
    text: 'Text and the attached brochure, image, or video are delivered through WhatsApp Cloud API.',
    visual: <ApprovedReply />,
  },
  {
    step: '04',
    title: 'The owner gets the next action',
    text: 'WhatsAI captures the lead, records the appointment, or marks the chat for human takeover.',
    visual: <OwnerAction />,
  },
];

const industries = [
  {
    id: 'clinic',
    label: 'Clinics',
    icon: Stethoscope,
    question: 'Consultation fees kya hai? Aaj evening slot milega?',
    reply: 'Consultation is Rs 500. Today we have 6:30 PM and 7:15 PM available. Which slot should I hold?',
    action: 'Appointment intent captured',
  },
  {
    id: 'coaching',
    label: 'Coaching',
    icon: UsersRound,
    question: 'Fees aur next batch timing share kar do.',
    reply: 'The next weekday batch starts Monday at 6 PM. I can share the fee sheet and demo-class schedule.',
    action: 'Fee sheet attached',
  },
  {
    id: 'real-estate',
    label: 'Real estate',
    icon: Store,
    question: '3BHK ka price aur brochure bhejna.',
    reply: '3BHK homes start at Rs 45 lakh. I have attached the brochure. Would you prefer a weekday or weekend site visit?',
    action: 'Site-visit interest flagged',
  },
  {
    id: 'wellness',
    label: 'Gyms and salons',
    icon: HeartHandshake,
    question: 'Monthly package kitna hai? Gym video hai?',
    reply: 'The monthly plan starts at Rs 1,500. Here is the gym tour video. Would you like a trial session?',
    action: 'Tour video delivered',
  },
  {
    id: 'services',
    label: 'Local services',
    icon: Route,
    question: 'Pest control charges aur visit kab hoga?',
    reply: 'Service starts at Rs 899 after inspection. Share your area and preferred time so the team can confirm a visit.',
    action: 'Service area requested',
  },
];

export function WhatsAiLanding() {
  const root = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndustry, setActiveIndustry] = useState(industries[0].id);
  const [showMobileCta, setShowMobileCta] = useState(false);

  useEffect(() => {
    const updateMobileCta = () => {
      const pageHeight = document.documentElement.scrollHeight;
      const footerBuffer = 520;
      const pastHero = window.scrollY > Math.min(window.innerHeight * 0.82, 720);
      const beforeFooter = window.scrollY + window.innerHeight < pageHeight - footerBuffer;
      setShowMobileCta(pastHero && beforeFooter);
    };

    updateMobileCta();
    window.addEventListener('scroll', updateMobileCta, { passive: true });
    window.addEventListener('resize', updateMobileCta);
    return () => {
      window.removeEventListener('scroll', updateMobileCta);
      window.removeEventListener('resize', updateMobileCta);
    };
  }, []);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;

      const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTimeline
        .from('[data-hero-copy]', { y: 28, opacity: 0, duration: 0.8 })
        .from('[data-hero-actions]', { y: 18, opacity: 0, duration: 0.55 }, '-=0.42')
        .from('[data-hero-demo]', { y: 40, scale: 0.96, opacity: 0, duration: 0.9 }, '-=0.38');

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.from(element, {
          y: 34,
          duration: 0.72,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: { trigger: element, start: 'top 86%', once: true },
        });
      });

      const mediaQuery = gsap.matchMedia();
      mediaQuery.add('(min-width: 1024px)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-workflow-card]');
        cards.forEach((card) => {
          gsap.fromTo(
            card,
            { scale: 0.92, opacity: 0.38 },
            {
              scale: 1,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                start: 'top 78%',
                end: 'center 42%',
                scrub: true,
              },
            },
          );
        });
      });

      return () => mediaQuery.revert();
    },
    { scope: root },
  );

  const selectedIndustry = industries.find((industry) => industry.id === activeIndustry) ?? industries[0];

  return (
    <main ref={root} className="w-full max-w-full overflow-x-hidden bg-[#f6f7f3]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-[#101916] px-4 py-3 text-sm font-semibold text-white transition focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="absolute inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-6">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/70 bg-white/85 px-3 py-3 shadow-[0_18px_60px_rgba(16,25,22,0.08)] backdrop-blur-xl sm:px-5"
          aria-label="Primary navigation"
        >
          <a href="#top" className="flex min-h-11 items-center gap-3 rounded-xl px-2" aria-label="WhatsAI Assistant home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00a884] text-white shadow-[0_8px_24px_rgba(0,168,132,0.25)]">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-[-0.02em]">WhatsAI Assistant</span>
              <span className="hidden text-[11px] font-medium text-[#68746f] sm:block">The always-on front desk</span>
            </span>
          </a>

          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#53605b] transition hover:bg-[#edf2ef] hover:text-[#101916]">
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href={dashboardHref} className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-[#35413c] transition hover:bg-[#edf2ef] sm:inline-flex">
              Owner login
            </Link>
            <a href={setupHref} target="_blank" rel="noreferrer" className="hidden min-h-11 items-center rounded-xl bg-[#101916] px-4 text-sm font-semibold text-white transition hover:bg-[#075e54] sm:inline-flex">
              Book setup call
            </a>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#dce3df] bg-white text-[#101916] lg:hidden"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-[#dce3df] bg-white p-3 shadow-2xl lg:hidden">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-semibold text-[#35413c] hover:bg-[#edf2ef]">
                {item.label}
                <ArrowRight className="h-4 w-4" />
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#e1e7e3] pt-3">
              <Link href={dashboardHref} className="flex min-h-12 items-center justify-center rounded-xl border border-[#dce3df] text-sm font-semibold">Owner login</Link>
              <a href={setupHref} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl bg-[#075e54] text-sm font-semibold text-white">Book a call</a>
            </div>
          </div>
        )}
      </header>

      <div id="main-content">
        <section id="top" className="landing-grid relative overflow-hidden px-4 pb-20 pt-40 sm:px-6 sm:pb-28 sm:pt-48 lg:pb-36">
          <div className="absolute left-1/2 top-0 h-[32rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,168,132,0.22),rgba(217,253,211,0.08)_42%,transparent_70%)] blur-3xl" />
          <div className="landing-shell relative text-center">
            <div data-hero-copy className="mx-auto max-w-6xl">
              <h1 className="text-balance text-[clamp(3rem,7vw,6.5rem)] font-[680] leading-[0.92] tracking-[-0.066em] text-[#101916]">
                Turn WhatsApp enquiries into{' '}
                <span className="whitespace-nowrap text-[#075e54]">
                  booked
                  <span aria-hidden="true" className="mx-2 inline-flex h-[0.72em] w-[1.45em] translate-y-[0.02em] items-center justify-center rounded-full bg-[#d9fdd3] align-baseline sm:mx-3">
                    <CalendarCheck2 className="h-[0.44em] w-[0.44em] stroke-[2.5]" />
                  </span>
                  <span className="sr-only"> </span>
                  appointments.
                </span>
              </h1>
              <p className="mx-auto mt-7 max-w-3xl text-balance text-lg leading-8 text-[#52605a] sm:text-xl sm:leading-9">
                WhatsAI answers common questions with replies you approve, captures every lead, and hands hot conversations to your team before they go cold.
              </p>
            </div>

            <div data-hero-actions className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={setupHref} target="_blank" rel="noreferrer" className="group inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#075e54] px-7 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(7,94,84,0.2)] transition duration-300 hover:-translate-y-1 hover:bg-[#064f47] sm:w-auto">
                Book a 15-minute setup call
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </a>
              <a href="#workflow" className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border border-[#cbd5d0] bg-white/80 px-7 text-sm font-semibold text-[#101916] transition hover:border-[#00a884] hover:bg-white sm:w-auto">
                <Play className="mr-2 h-4 w-4 fill-current" />
                Watch the real workflow
              </a>
            </div>
            <p className="mt-5 text-sm font-medium text-[#68746f]">Works with WhatsApp Cloud API. Every automated reply stays under your control.</p>

            <div data-hero-demo className="mx-auto mt-14 max-w-6xl sm:mt-20">
              <HeroProductDemo />
            </div>
          </div>
        </section>

        <CapabilityMarquee />

        <section id="product" className="px-4 py-28 sm:px-6 sm:py-36 lg:py-48">
          <div className="landing-shell">
            <SectionIntro
              kicker="A calmer sales day"
              title="Your front desk follows the playbook, even when your team is busy."
              text="WhatsAI keeps the repetitive questions moving and gives the owner a clean next action. It does not invent answers."
            />
            <div className="mt-14 grid grid-flow-dense overflow-hidden rounded-[2rem] border border-[#dce3df] bg-[#dce3df] md:grid-cols-12">
              {outcomes.map((outcome) => (
                <OutcomeCard key={outcome.title} outcome={outcome} />
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-[#101916] px-4 py-28 text-white sm:px-6 sm:py-36 lg:py-48">
          <div className="landing-shell grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div className="self-start lg:sticky lg:top-28">
              <p className="text-sm font-semibold text-[#7ee5c3]">From first message to next action</p>
              <h2 className="mt-5 max-w-xl text-balance text-4xl font-[650] leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Smart enough for Hinglish. Controlled enough for business.
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-white/60">
                The system matches the customer’s intent, sends the answer you approved, and records what happened. No improvised promises.
              </p>
              <div className="mt-8 flex items-center gap-3 text-sm font-medium text-white/70">
                <LockKeyhole className="h-5 w-5 text-[#7ee5c3]" />
                No LLM-generated customer replies
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {workflow.map((item) => (
                <article key={item.step} data-workflow-card className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.18)] backdrop-blur sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-[#7ee5c3]">{item.step}</span>
                    <CircleCheck className="h-5 w-5 text-white/30" />
                  </div>
                  <h3 className="mt-10 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{item.title}</h3>
                  <p className="mt-3 max-w-xl text-base leading-7 text-white/58">{item.text}</p>
                  <div className="mt-8">{item.visual}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="industries" className="px-4 py-28 sm:px-6 sm:py-36 lg:py-48">
          <div className="landing-shell">
            <SectionIntro
              kicker="Built around real questions"
              title="Start with a ready-made playbook for your business."
              text="Choose your category, replace the sample details with your own, and approve every response before it goes live."
            />

            <div className="mt-14 grid overflow-hidden rounded-[2rem] border border-[#dce3df] bg-white shadow-[0_30px_90px_rgba(16,25,22,0.08)] lg:grid-cols-[0.42fr_0.58fr]">
              <div className="border-b border-[#dce3df] p-3 lg:border-b-0 lg:border-r">
                {industries.map((industry) => {
                  const active = industry.id === activeIndustry;
                  return (
                    <button
                      key={industry.id}
                      type="button"
                      className={`group flex min-h-16 w-full items-center justify-between rounded-2xl px-4 text-left transition sm:min-h-[4.75rem] ${active ? 'bg-[#075e54] text-white' : 'text-[#53605b] hover:bg-[#edf2ef] hover:text-[#101916]'}`}
                      aria-pressed={active}
                      onClick={() => setActiveIndustry(industry.id)}
                    >
                      <span className="flex items-center gap-3 font-semibold">
                        <industry.icon className={`h-5 w-5 ${active ? 'text-[#a7f3d0]' : 'text-[#00a884]'}`} />
                        {industry.label}
                      </span>
                      <ArrowRight className={`h-4 w-4 transition ${active ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                    </button>
                  );
                })}
              </div>

              <IndustryConversation industry={selectedIndustry} />
            </div>
          </div>
        </section>

        <section id="control" className="px-4 pb-28 sm:px-6 sm:pb-36 lg:pb-48">
          <div className="landing-shell overflow-hidden rounded-[2.5rem] bg-[#d9fdd3] px-6 py-12 sm:px-10 sm:py-16 lg:grid lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:px-16 lg:py-20">
            <div data-reveal>
              <p className="text-sm font-semibold text-[#075e54]">Control is the product</p>
              <h2 className="mt-5 max-w-2xl text-balance text-4xl font-[650] leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Automation should never surprise the owner.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#34534a]">
                Every answer starts with your rule. Every conversation stays visible. Every hot lead can move to a human instantly.
              </p>
            </div>
            <div data-reveal className="mt-10 grid gap-3 lg:mt-0">
              {[
                ['Exact replies', 'Customers receive the wording you approved.'],
                ['Human takeover', 'Pause automation from the conversation panel.'],
                ['Business separation', 'Each business has its own channel and playbook.'],
                ['Clear history', 'Inbound and outbound messages stay in one thread.'],
              ].map(([title, text]) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-[#075e54]/10 bg-white/70 p-4 backdrop-blur sm:p-5">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#075e54] p-1 text-white" />
                  <div>
                    <h3 className="font-semibold text-[#101916]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#526b63]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-[#ebece7] px-4 py-28 sm:px-6 sm:py-36 lg:py-48">
          <div className="landing-shell grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:gap-20">
            <div data-reveal className="lg:sticky lg:top-28">
              <p className="text-sm font-semibold text-[#075e54]">Assisted pilot for local businesses</p>
              <h2 className="mt-5 text-balance text-4xl font-[650] leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Start with one number and one workflow that works.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#59655f]">
                We configure the first playbook with you, connect the channel, and prove the workflow before adding complexity.
              </p>
            </div>

            <div data-reveal className="overflow-hidden rounded-[2rem] border border-[#cfd7d2] bg-white shadow-[0_30px_90px_rgba(16,25,22,0.1)]">
              <div className="border-b border-[#dce3df] p-6 sm:p-9">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#00a884]">WhatsAI assisted setup</p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">One business. One WhatsApp number.</h3>
                  </div>
                  <BadgeIndianRupee className="h-10 w-10 text-[#075e54]" />
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#f3f5f2] p-5">
                    <p className="text-sm font-medium text-[#68746f]">One-time setup</p>
                    <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Rs 2,999</p>
                  </div>
                  <div className="rounded-2xl bg-[#d9fdd3] p-5">
                    <p className="text-sm font-medium text-[#416157]">Monthly service</p>
                    <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#075e54]">Rs 1,499</p>
                  </div>
                </div>
              </div>
              <div className="p-6 sm:p-9">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    'One WhatsApp number',
                    'Assisted channel setup',
                    'Industry rule templates',
                    'Hinglish-ready matching',
                    'Lead and conversation dashboard',
                    'Media replies and handoff',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm font-medium text-[#35413c]">
                      <Check className="h-5 w-5 rounded-full bg-[#00a884] p-1 text-white" />
                      {item}
                    </div>
                  ))}
                </div>
                <a href={setupHref} target="_blank" rel="noreferrer" className="group mt-9 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#101916] px-6 text-sm font-semibold text-white transition hover:bg-[#075e54]">
                  Check if your business is a fit
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </a>
                <p className="mt-4 text-center text-xs leading-5 text-[#74807a]">
                  Meta conversation charges, if applicable beyond Meta’s free allowance, are billed separately by Meta. We confirm all costs before activation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#075e54] px-4 py-28 text-white sm:px-6 sm:py-36 lg:py-44">
          <div className="landing-noise pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-soft-light" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(126,229,195,0.22),transparent_50%)]" />
          <div data-reveal className="landing-shell relative text-center">
            <h2 className="mx-auto max-w-5xl text-balance text-5xl font-[650] leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Let your WhatsApp answer while you run the business.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/68">
              Bring one real customer question. We will show you how the approved-reply workflow handles it.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={setupHref} target="_blank" rel="noreferrer" className="group inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-7 text-sm font-semibold text-[#075e54] transition hover:-translate-y-1 hover:bg-[#d9fdd3]">
                WhatsApp us for a live demo
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </a>
              <a href="mailto:rohit@xeroseven.in?subject=WhatsAI%20Assistant%20demo" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/25 px-7 text-sm font-semibold text-white transition hover:bg-white/10">
                Contact by email
              </a>
            </div>
          </div>
        </section>
      </div>

      <LandingFooter />

      {showMobileCta && (
        <a
          href={setupHref}
          target="_blank"
          rel="noreferrer"
          className="fixed inset-x-4 bottom-4 z-40 flex min-h-14 items-center justify-center rounded-2xl bg-[#075e54] px-5 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(7,94,84,0.3)] sm:hidden"
        >
          Book a setup call
          <ArrowRight className="ml-2 h-4 w-4" />
        </a>
      )}
    </main>
  );
}

function SectionIntro({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <div data-reveal className="max-w-4xl">
      <p className="text-sm font-semibold text-[#07866f]">{kicker}</p>
      <h2 className="mt-5 text-balance text-4xl font-[650] leading-[1.02] tracking-[-0.045em] text-[#101916] sm:text-5xl lg:text-6xl">{title}</h2>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[#59655f]">{text}</p>
    </div>
  );
}

function HeroProductDemo() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#cfd8d3] bg-[#101916] p-2 shadow-[0_40px_120px_rgba(16,25,22,0.2)] sm:rounded-[2.5rem] sm:p-3">
      <div className="overflow-hidden rounded-[1.35rem] bg-[#f7f8f6] sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-[#dce3df] bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e56f5d]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e7b84c]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#52b788]" />
          </div>
          <p className="text-[11px] font-semibold text-[#74807a] sm:text-xs">Live product workflow</p>
          <span className="hidden items-center gap-1.5 text-xs font-semibold text-[#07866f] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#00a884]" />
            Connected
          </span>
        </div>
        <div className="grid min-h-[27rem] lg:grid-cols-[0.34fr_0.66fr]">
          <div className="hidden border-r border-[#dce3df] bg-white p-4 lg:block">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Conversations</p>
              <MessagesSquare className="h-4 w-4 text-[#00a884]" />
            </div>
            <div className="mt-4 space-y-2">
              {[
                ['NK', 'Neha Kapoor', 'Fees kya hai?', true],
                ['AS', 'Amit Sharma', 'Brochure mil sakta hai?', false],
                ['PS', 'Priya Singh', 'Evening timing?', false],
              ].map(([initials, name, text, active]) => (
                <div key={String(name)} className={`flex items-center gap-3 rounded-xl p-3 ${active ? 'bg-[#e7f8f1]' : 'bg-transparent'}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9fdd3] text-xs font-bold text-[#075e54]">{initials}</span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#74807a]">{text}</p>
                  </div>
                  {active && <span className="ml-auto h-2 w-2 rounded-full bg-[#00a884]" />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_0.68fr]">
            <div className="bg-[#efeae2] p-4 sm:p-6">
              <div className="flex items-center gap-3 rounded-2xl bg-white/85 p-3 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9fdd3] text-sm font-bold text-[#075e54]">NK</span>
                <div>
                  <p className="text-sm font-semibold">Neha Kapoor</p>
                  <p className="text-[11px] text-[#68746f]">WhatsApp enquiry</p>
                </div>
                <span className="ml-auto rounded-lg bg-[#fff3d8] px-2 py-1 text-[10px] font-semibold text-[#925d00]">Qualifying</span>
              </div>
              <div className="mt-6 space-y-3">
                <DemoBubble>Hi, consultation fess kya hai?</DemoBubble>
                <DemoBubble outbound label="Approved reply">
                  Consultation is Rs 500. Today we have 6:30 PM and 7:15 PM available. Which slot should I hold?
                </DemoBubble>
                <DemoBubble>7:15 works</DemoBubble>
                <DemoBubble outbound label="Approved reply">
                  I have held 7:15 PM. Please share the patient name to confirm.
                </DemoBubble>
              </div>
            </div>

            <div className="hidden bg-white p-5 md:block">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Lead details</p>
                <span className="rounded-lg bg-[#ffe8dc] px-2 py-1 text-[10px] font-semibold text-[#a04318]">Hot lead</span>
              </div>
              <div className="mt-5 space-y-4">
                <DemoDetail label="Intent" value="Consultation" />
                <DemoDetail label="Preferred slot" value="Today, 7:15 PM" />
                <DemoDetail label="Source" value="WhatsApp" />
              </div>
              <div className="mt-6 rounded-2xl border border-[#bfead9] bg-[#edfbf6] p-4">
                <CalendarCheck2 className="h-5 w-5 text-[#07866f]" />
                <p className="mt-3 text-xs font-semibold">Appointment ready to confirm</p>
                <p className="mt-1 text-[11px] leading-5 text-[#68746f]">The owner sees the exact chat and next action.</p>
              </div>
              <div className="mt-4 flex min-h-10 w-full items-center justify-center rounded-xl bg-[#101916] text-xs font-semibold text-white">Take over conversation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoBubble({ children, outbound = false, label }: { children: React.ReactNode; outbound?: boolean; label?: string }) {
  return (
    <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-left text-xs leading-5 shadow-sm sm:max-w-[80%] ${outbound ? 'rounded-tr-sm bg-[#d9fdd3]' : 'rounded-tl-sm bg-white'}`}>
        {label && <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#07866f]">{label}</p>}
        {children}
      </div>
    </div>
  );
}

function DemoDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#e5e9e7] pb-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#8a948f]">{label}</p>
      <p className="mt-1 text-xs font-semibold">{value}</p>
    </div>
  );
}

function CapabilityMarquee() {
  const items = ['Approved replies', 'Hinglish-ready', 'Human takeover', 'Media support', 'Lead capture', 'Appointment tracking'];
  return (
    <div className="overflow-hidden border-y border-[#dce3df] bg-white py-5" aria-label="WhatsAI capabilities">
      <div className="flex min-w-max animate-[marquee_28s_linear_infinite] items-center gap-8 motion-reduce:animate-none">
        {[...items, ...items].map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-8">
            <span className="text-sm font-semibold text-[#53605b]">{item}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#00a884]" />
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  return (
    <article data-reveal className={`group min-h-[25rem] overflow-hidden bg-white p-6 sm:p-8 ${outcome.className}`}>
      <div className="flex h-full flex-col">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d9fdd3] text-[#075e54]">
          <outcome.icon className="h-5 w-5" />
        </div>
        <h3 className="mt-7 max-w-lg text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">{outcome.title}</h3>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[#68746f]">{outcome.text}</p>
        <div className="mt-auto pt-8 transition-transform duration-700 ease-out group-hover:scale-[1.025]">
          <OutcomeVisual type={outcome.visual} />
        </div>
      </div>
    </article>
  );
}

function OutcomeVisual({ type }: { type: Outcome['visual'] }) {
  if (type === 'rules') {
    return (
      <div className="rounded-2xl border border-[#dce3df] bg-[#f6f7f3] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Fees and pricing</p>
          <span className="rounded-lg bg-[#d9fdd3] px-2 py-1 text-[10px] font-semibold text-[#075e54]">Active</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['fees', 'fess', 'kitna lagega', 'price'].map((word) => <span key={word} className="rounded-lg border border-[#dce3df] bg-white px-2 py-1 text-[10px] font-medium">{word}</span>)}
        </div>
        <p className="mt-4 rounded-xl bg-white p-3 text-xs leading-5 text-[#52605a]">Monthly plans start at Rs 1,500. Would you like the complete fee sheet?</p>
      </div>
    );
  }
  if (type === 'lead') {
    return (
      <div className="rounded-2xl bg-[#101916] p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9fdd3] text-xs font-bold text-[#075e54]">AK</span>
          <div><p className="text-xs font-semibold">Aarav Khanna</p><p className="mt-0.5 text-[10px] text-white/50">New WhatsApp lead</p></div>
          <span className="ml-auto rounded-lg bg-[#fff1d6] px-2 py-1 text-[10px] font-semibold text-[#995f00]">Interested</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
          <span className="rounded-xl bg-white/10 p-2.5">Source: WhatsApp</span>
          <span className="rounded-xl bg-white/10 p-2.5">Next: Follow up</span>
        </div>
      </div>
    );
  }
  if (type === 'takeover') {
    return (
      <div className="rounded-2xl border border-[#f1d2bf] bg-[#fff5ed] p-4">
        <div className="flex items-center gap-3"><PauseCircle className="h-5 w-5 text-[#b94d1e]" /><p className="text-xs font-semibold">Human is in control</p></div>
        <div className="mt-4 flex min-h-10 w-full items-center justify-center rounded-xl bg-[#101916] text-xs font-semibold text-white">Resume approved replies</div>
      </div>
    );
  }
  if (type === 'media') {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[[ImageIcon, 'Image'], [Video, 'Video'], [FileText, 'PDF']].map(([Icon, label]) => {
          const MediaIcon = Icon as LucideIcon;
          return <div key={String(label)} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-[#dce3df] bg-[#f6f7f3]"><MediaIcon className="h-5 w-5 text-[#07866f]" /><span className="mt-2 text-[10px] font-semibold">{label as string}</span></div>;
        })}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-[#dce3df] p-4">
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 14 }).map((_, index) => <span key={index} className={`flex aspect-square items-center justify-center rounded-lg text-[9px] ${index === 9 ? 'bg-[#075e54] font-semibold text-white' : 'bg-[#f0f3f1] text-[#74807a]'}`}>{index + 12}</span>)}
      </div>
      <p className="mt-3 text-[10px] font-semibold text-[#07866f]">Appointment captured: 21 July, 6:30 PM</p>
    </div>
  );
}

function CustomerQuestion() {
  return <div className="rounded-2xl bg-[#efeae2] p-5"><div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-[#101916] shadow-sm">Consultation fess kya hai? Aaj evening slot h?</div></div>;
}

function RuleMatch() {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-5"><div className="flex items-center gap-3"><MousePointerClick className="h-5 w-5 text-[#7ee5c3]" /><div><p className="text-sm font-semibold">Consultation fee and timing</p><p className="mt-1 text-xs text-white/45">Matched: fess, evening slot</p></div><span className="ml-auto rounded-lg bg-[#7ee5c3]/15 px-2 py-1 text-[10px] font-semibold text-[#7ee5c3]">Rule found</span></div></div>;
}

function ApprovedReply() {
  return <div className="rounded-2xl bg-[#efeae2] p-5"><div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-sm leading-6 text-[#101916] shadow-sm"><p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#07866f]">Approved reply</p>Consultation is Rs 500. Today we have 6:30 PM and 7:15 PM available.</div></div>;
}

function OwnerAction() {
  return <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#d9fdd3] p-4 text-[#101916]"><CalendarCheck2 className="h-5 w-5 text-[#075e54]" /><p className="mt-3 text-sm font-semibold">Appointment ready</p><p className="mt-1 text-xs text-[#52605a]">Today, 7:15 PM</p></div><div className="rounded-2xl bg-[#fff1e7] p-4 text-[#101916]"><UserRoundCheck className="h-5 w-5 text-[#b94d1e]" /><p className="mt-3 text-sm font-semibold">Owner handoff</p><p className="mt-1 text-xs text-[#6f5b50]">High-intent lead</p></div></div>;
}

function IndustryConversation({ industry }: { industry: (typeof industries)[number] }) {
  return (
    <div className="relative overflow-hidden bg-[#efeae2] p-5 sm:p-8 lg:p-10">
      <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#075e54_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative mx-auto max-w-xl">
        <div className="flex items-center justify-between rounded-2xl bg-white/90 p-3 shadow-sm">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9fdd3] text-[#075e54]"><industry.icon className="h-5 w-5" /></span><div><p className="text-sm font-semibold">{industry.label} playbook</p><p className="text-[11px] text-[#68746f]">Example conversation</p></div></div>
          <span className="h-2.5 w-2.5 rounded-full bg-[#00a884]" />
        </div>
        <div className="mt-7 space-y-3">
          <div className="max-w-[84%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-6 shadow-sm">{industry.question}</div>
          <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-sm leading-6 shadow-sm"><p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#07866f]">Owner-approved reply</p>{industry.reply}</div>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#00a884]/20 bg-white/85 p-4 text-xs font-semibold text-[#075e54] shadow-sm"><Sparkles className="h-4 w-4" />{industry.action}</div>
      </div>
    </div>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-[#101916] px-4 pb-28 pt-16 text-white sm:px-6 sm:pb-12 sm:pt-20">
      <div className="landing-shell">
        <div className="grid gap-12 border-b border-white/10 pb-12 md:grid-cols-[1.4fr_0.6fr_0.6fr]">
          <div>
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00a884]"><MessageCircle className="h-5 w-5" /></span><p className="font-semibold">WhatsAI Assistant</p></div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/50">A controlled WhatsApp receptionist for Indian SMBs. Built by Xero Seven Private Limited.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">Product</p>
            <div className="mt-4 grid gap-3 text-sm text-white/50"><a href="#workflow" className="hover:text-white">How it works</a><a href="#industries" className="hover:text-white">Industries</a><a href="#pricing" className="hover:text-white">Pricing</a><Link href={dashboardHref} className="hover:text-white">Owner login</Link></div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">Company</p>
            <div className="mt-4 grid gap-3 text-sm text-white/50"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link><a href="mailto:rohit@xeroseven.in" className="hover:text-white">Contact</a></div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-8 text-xs text-white/38 sm:flex-row sm:items-center sm:justify-between"><p>Copyright 2026 Xero Seven Private Limited. All rights reserved.</p><p>Made for owner-led Indian businesses.</p></div>
      </div>
    </footer>
  );
}
