import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { landingSupabase } from '@/lib/supabase';
import { Hero } from '@/components/sections/Hero';
import { LocationSection } from '@/components/sections/LocationSection';
import { AmenitiesSection } from '@/components/sections/AmenitiesSection';
import { GallerySection } from '@/components/sections/GallerySection';
import { PricingSection } from '@/components/sections/PricingSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { FAQSection } from '@/components/sections/FAQSection';
import { SiteVisitSection } from '@/components/sections/SiteVisitSection';
import { Footer } from '@/components/sections/Footer';
import type { LandingProject, LandingBuilder, LandingPageConfig } from '@/lib/types';

interface PageParams { params: { builder: string; project: string } }

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function fetchPage(params: PageParams['params']) {
  const sb = landingSupabase();
  const { data: builderRows } = await (sb.from('builders') as any).select('*');
  const builders = (builderRows ?? []) as LandingBuilder[];
  const builder = builders.find(
    (b) => (b.brand_colors as any)?.slug === params.builder || slugify(b.company_name) === params.builder,
  );
  if (!builder) return null;

  const { data: project } = await (sb.from('projects') as any).select('*').eq('slug', params.project).eq('builder_id', builder.id).maybeSingle();
  if (!project) return null;

  const { data: config } = await (sb.from('landing_pages') as any).select('*').eq('project_id', project.id).maybeSingle();
  return { project: project as LandingProject, builder, config: config as LandingPageConfig | null };
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const data = await fetchPage(params).catch(() => null);
  if (!data) return { title: 'Project not found' };
  const { project, builder, config } = data;
  return {
    title: config?.seo_title ?? `${project.name} — ${project.location}`,
    description: config?.seo_description ?? `WhatsApp-assisted offer page for ${project.name} in ${project.location}, ${project.city}. Starting from ₹${project.price_range_min} Lakh. By ${builder.company_name}.`,
    openGraph: {
      title: project.name,
      description: `Starting from ₹${project.price_range_min} Lakh · WhatsApp callback · ${project.location}`,
      images: config?.hero_image_url ? [config.hero_image_url] : (project.hero_image_url ? [project.hero_image_url] : []),
    },
  };
}

export default async function LandingPage({ params }: PageParams) {
  const data = await fetchPage(params);
  if (!data) notFound();
  const { project, builder, config } = data;
  const testimonials = config?.testimonials ?? [];
  const faqs = config?.faqs ?? defaultFaqs(project, builder);
  const gallery = config?.gallery_urls ?? [];
  const heroImage = config?.hero_image_url ?? project.hero_image_url;

  return (
    <main>
      <Hero project={project} builder={builder} heroImageUrl={heroImage} />
      <LocationSection project={project} />
      <AmenitiesSection project={project} />
      <GallerySection urls={gallery} />
      <PricingSection project={project} builder={builder} />
      <TestimonialsSection testimonials={testimonials} />
      <FAQSection faqs={faqs} />
      <SiteVisitSection project={project} builder={builder} />
      <Footer project={project} builder={builder} />
      {config?.meta_pixel_id && <MetaPixel id={config.meta_pixel_id} />}
      {config?.google_tag_id && <GoogleTag id={config.google_tag_id} />}
    </main>
  );
}

function defaultFaqs(project: LandingProject, builder: LandingBuilder) {
  return [
    { q: 'Is this offer verified?', a: project.rera_number ? `Yes — verification reference ${project.rera_number}.` : 'The business team will confirm verification details on WhatsApp.' },
    { q: 'What is the next step?', a: 'Share your name and phone number. The WhatsAI assistant will qualify your need and route hot enquiries to the owner.' },
    { q: 'How is pricing shared?', a: `The business team can share current packages between ₹${project.price_range_min} Lakh and ₹${project.price_range_max} Lakh based on fit and availability.` },
    { q: 'Can I speak to a person?', a: 'Yes. Qualified or urgent enquiries are handed off to the business owner or team.' },
    { q: 'How do I book an appointment?', a: `WhatsApp ${builder.whatsapp_number ?? builder.phone} — we will confirm the right callback or appointment slot.` },
  ];
}

function MetaPixel({ id }: { id: string }) {
  return (
    <>
      <noscript><img height="1" width="1" alt="" style={{ display: 'none' }} src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} /></noscript>
      <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');` }} />
    </>
  );
}

function GoogleTag({ id }: { id: string }) {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
      <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');` }} />
    </>
  );
}
