export interface LandingProject {
  id: string; builder_id: string; name: string; slug: string; location: string; city: string;
  latitude: number | null; longitude: number | null; total_plots: number; available_plots: number;
  price_range_min: number | null; price_range_max: number | null; rera_number: string | null;
  project_type: string; amenities: string[]; nearby_landmarks: Array<{ name: string; type: string; distance_km: number }>;
  hero_image_url: string | null; brochure_url: string | null; description: string | null;
}
export interface LandingBuilder {
  id: string; company_name: string; phone: string; whatsapp_number: string | null; email: string | null;
  logo_url: string | null; brand_colors: Record<string, string>;
}
export interface LandingPageConfig {
  id: string; slug: string; custom_domain: string | null; hero_image_url: string | null;
  testimonials: Array<{ name: string; city: string; occupation?: string; quote: string; rating?: number }>;
  faqs: Array<{ q: string; a: string }>; gallery_urls: string[];
  meta_pixel_id: string | null; google_tag_id: string | null; seo_title: string | null; seo_description: string | null;
}
