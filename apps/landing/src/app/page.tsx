import {
  ArrowRight,
  BellRing,
  Building2,
  Check,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  MessageCircle,
  PhoneCall,
  Send,
  Sparkles,
  Wrench,
} from 'lucide-react';

const trialHref = 'https://wa.me/919999888877?text=Hello%2C%20mujhe%20X7%20WhatsAI%20Assistant%20ke%20baare%20mein%20jaanna%20hai';

const steps = [
  { icon: MessageCircle, title: 'Customer sends WhatsApp message', copy: 'AI replies in seconds with your business tone and working hours.' },
  { icon: Sparkles, title: 'AI asks the right questions', copy: 'Budget, need, timing, service type, and urgency are collected automatically.' },
  { icon: BellRing, title: 'Hot lead? Owner gets alert', copy: 'Qualified leads are sent to the owner with context and next action.' },
];

const chat = [
  { from: 'customer', text: 'Hello, mujhe 2BHK chahiye Super Corridor mein' },
  { from: 'ai', text: 'Namaste! Budget kitna hai aapka?' },
  { from: 'customer', text: '50 lakh tak' },
  { from: 'ai', text: 'Perfect! Kab tak lena chahte hain? Is month?' },
  { from: 'customer', text: 'Haan, jaldi chahiye' },
  { from: 'ai', text: 'Ek moment — main aapka visit schedule kar deta hu. Owner se directly baat karna chahenge?' },
];

const verticals = [
  { icon: Building2, name: 'Real Estate', promise: 'Qualify buyers, capture budget, and push hot site-visit requests.' },
  { icon: HeartPulse, name: 'Clinic', promise: 'Book appointments and collect symptoms without giving medical advice.' },
  { icon: GraduationCap, name: 'Coaching', promise: 'Handle admission enquiries, course fit, fees, and demo-class intent.' },
  { icon: Dumbbell, name: 'Gym', promise: 'Capture fitness goals, preferred timing, and membership readiness.' },
  { icon: Wrench, name: 'Local Services', promise: 'Take service requests, urgency, location, and callback preference.' },
];

const plans = [
  { name: 'Trial', price: '₹999', period: '7 days', detail: 'Managed setup, one playbook, up to 50 messages/day.' },
  { name: 'Basic', price: '₹2,999', period: '/mo', detail: '24/7 receptionist, lead qualification, daily summary.' },
  { name: 'Growth', price: '₹7,999', period: '/mo', detail: 'More message volume, handoff alerts, appointment workflows.' },
  { name: 'Pro', price: '₹14,999', period: '/mo', detail: 'Multi-playbook setup, white-label options, priority onboarding.' },
];

const inboxItems = [
  ['Aditya Sharma', '2BHK Super Corridor', 'Hot'],
  ['Dr. Meena Joshi', 'Saturday appointment', 'Booked'],
  ['Rohit Verma', 'Coaching fee enquiry', 'Qualifying'],
  ['FitZone Lead', 'Evening gym slot', 'Warm'],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f3ea] text-[#1b2a29]">
      <Hero />
      <HowItWorks />
      <ExampleChat />
      <Verticals />
      <Pricing />
      <FooterCta />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[92vh] border-b border-[#1b2a29]/10">
      <div className="absolute inset-0 bg-[#143b35]">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute left-1/2 top-10 hidden w-[640px] -translate-x-1/2 rotate-[-6deg] gap-3 opacity-40 lg:grid">
          {inboxItems.map(([name, text, status]) => (
            <div key={name} className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-2xl backdrop-blur">
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-xs text-white/70">{text}</p>
              </div>
              <span className="rounded-full bg-[#f6c453] px-3 py-1 text-xs font-bold text-[#17302c]">{status}</span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 right-0 h-[70%] w-full bg-[radial-gradient(circle_at_80%_40%,rgba(246,196,83,.24),transparent_34%)]" />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25d366] text-[#0f2c28]">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold tracking-wide">X7 WhatsAI</span>
        </div>
        <a href={trialHref} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[#143b35]">
          Start trial
        </a>
      </nav>

      <div className="relative z-10 mx-auto grid min-h-[calc(92vh-80px)] max-w-7xl items-end gap-10 px-5 pb-10 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-16">
        <div className="max-w-3xl pb-8 text-white">
          <p className="mb-5 inline-flex rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white/85">
            Built for Indian SMBs who live on WhatsApp
          </p>
          <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            X7 WhatsAI Assistant
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-white/82">
            24/7 WhatsApp receptionist for Indian businesses. Never miss a customer again.
          </p>
          <p className="mt-3 font-hindi text-lg font-semibold text-[#f6c453]">
            Aapka business sote waqt bhi leads qualify karta rahe.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={trialHref} className="inline-flex items-center justify-center rounded-full bg-[#25d366] px-6 py-3 text-sm font-black text-[#0f2c28] shadow-xl shadow-black/20 transition hover:translate-y-[-1px]">
              Start 7-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a href="#chat" className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              See conversation
            </a>
          </div>
        </div>
        <HeroPhone />
      </div>
    </section>
  );
}

function HeroPhone() {
  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[2rem] border border-white/20 bg-[#101816] p-3 shadow-2xl shadow-black/35">
      <div className="overflow-hidden rounded-[1.5rem] bg-[#efe7d4]">
        <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
          <div className="h-9 w-9 rounded-full bg-[#25d366]" />
          <div>
            <p className="text-sm font-bold">X7 Assistant</p>
            <p className="text-xs text-white/75">online · replies in 4s</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {chat.slice(0, 5).map((item, index) => (
            <ChatBubble key={`${item.text}-${index}`} {...item} />
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-black/10 bg-white/70 p-3">
          <div className="flex-1 rounded-full bg-white px-4 py-2 text-sm text-slate-500">Type message</div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25d366] text-[#0f2c28]">
            <Send className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
      <SectionIntro eyebrow="How it works" title="One WhatsApp number. Three useful jobs." />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-3xl border border-[#1b2a29]/10 bg-white p-6 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <step.icon className="h-7 w-7 text-[#0d7d67]" />
              <span className="font-mono text-sm font-bold text-[#b84a2b]">0{index + 1}</span>
            </div>
            <h3 className="text-xl font-black">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#53615f]">{step.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExampleChat() {
  return (
    <section id="chat" className="bg-[#1b2a29] px-5 py-16 text-white sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div>
          <SectionIntro eyebrow="Example chat" title="A real lead, qualified before you pick up the phone." dark />
          <p className="mt-5 text-base leading-7 text-white/70">
            This is the first wedge: answer fast, ask clean questions, and alert the owner only when the lead is worth attention.
          </p>
        </div>
        <div className="rounded-[2rem] bg-[#efe7d4] p-4 text-[#1b2a29] shadow-2xl">
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#075e54] px-4 py-3 text-white">
            <div>
              <p className="font-bold">WhatsApp conversation</p>
              <p className="text-xs text-white/70">AI qualifying a real estate lead</p>
            </div>
            <PhoneCall className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            {chat.map((item, index) => (
              <ChatBubble key={`${item.text}-${index}`} {...item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Verticals() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
      <SectionIntro eyebrow="Business verticals" title="Start with one niche. Reuse the same engine." />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {verticals.map((vertical) => (
          <div key={vertical.name} className="rounded-3xl border border-[#1b2a29]/10 bg-white p-5 shadow-sm">
            <vertical.icon className="h-7 w-7 text-[#b84a2b]" />
            <h3 className="mt-6 text-lg font-black">{vertical.name}</h3>
            <p className="mt-3 text-sm leading-6 text-[#53615f]">{vertical.promise}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="border-y border-[#1b2a29]/10 bg-white px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionIntro eyebrow="Pricing" title="A trial offer an SMB owner can understand." />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-3xl border p-6 ${plan.name === 'Growth' ? 'border-[#25d366] bg-[#f0fff6]' : 'border-[#1b2a29]/10 bg-[#fbfaf6]'}`}>
              <h3 className="text-lg font-black">{plan.name}</h3>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="pb-1 text-sm text-[#53615f]">{plan.period}</span>
              </div>
              <p className="mt-4 min-h-16 text-sm leading-6 text-[#53615f]">{plan.detail}</p>
              <a href={trialHref} className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#1b2a29] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0d7d67]">
                Talk on WhatsApp
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterCta() {
  return (
    <footer className="bg-[#f7f3ea] px-5 py-16 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-[2rem] bg-[#143b35] p-8 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-black">Start your 7-day trial today.</h2>
          <p className="mt-2 text-white/70">Setup in 10 minutes. No app download.</p>
        </div>
        <a href={trialHref} className="inline-flex items-center justify-center rounded-full bg-[#25d366] px-6 py-3 text-sm font-black text-[#0f2c28]">
          Start 7-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" />
        </a>
      </div>
    </footer>
  );
}

function SectionIntro({ eyebrow, title, dark = false }: { eyebrow: string; title: string; dark?: boolean }) {
  return (
    <div className="max-w-2xl">
      <p className={`text-sm font-black uppercase tracking-[0.18em] ${dark ? 'text-[#f6c453]' : 'text-[#b84a2b]'}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-black tracking-tight sm:text-5xl ${dark ? 'text-white' : 'text-[#1b2a29]'}`}>{title}</h2>
    </div>
  );
}

function ChatBubble({ from, text }: { from: string; text: string }) {
  const isAi = from === 'ai';
  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${isAi ? 'bg-white text-[#1b2a29]' : 'bg-[#dcf8c6] text-[#1b2a29]'}`}>
        {text}
      </div>
    </div>
  );
}
