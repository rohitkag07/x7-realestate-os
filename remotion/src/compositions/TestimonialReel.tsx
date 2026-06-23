import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Watermark } from '../components/Watermark';
export const propsSchemaTestimonial = z.object({
  buyerName: z.string(), buyerCity: z.string(), buyerOccupation: z.string().optional(),
  testimonial: z.string(), testimonialHi: z.string().optional(), rating: z.number().min(1).max(5).default(5),
  brandPrimary: z.string().default('#0F172A'), brandAccent: z.string().default('#F59E0B'), projectName: z.string(),
});
export const defaultTestimonialProps: z.infer<typeof propsSchemaTestimonial> = {
  buyerName: 'Rajesh Sharma', buyerCity: 'Indore', buyerOccupation: 'IT Professional',
  testimonial: 'I bought a plot last year. The value has already doubled.', testimonialHi: 'Maine pichle saal plot liya. Value double ho chuki hai.',
  rating: 5, brandPrimary: '#0F172A', brandAccent: '#F59E0B', projectName: 'Krishna Greens',
};
export const TestimonialReel: React.FC<z.infer<typeof propsSchemaTestimonial>> = (props) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const head = spring({ frame, fps, durationInFrames: 20 });
  const textOpacity = interpolate(frame, [fps * 1, fps * 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${props.brandPrimary} 0%, #1e293b 100%)`, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: 80, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ opacity: head }}>
          <div style={{ color: props.brandAccent, fontSize: 28, letterSpacing: 4, textTransform: 'uppercase' }}>⭐ Buyer Story</div>
          <div style={{ fontSize: 56, fontWeight: 800, marginTop: 12 }}>{props.buyerName}</div>
          <div style={{ fontSize: 28, opacity: 0.7, marginTop: 8 }}>{props.buyerOccupation && `${props.buyerOccupation} · `}{props.buyerCity}</div>
          <div style={{ marginTop: 16, fontSize: 36 }}>{'⭐'.repeat(props.rating)}</div>
        </div>
        <div style={{ opacity: textOpacity }}>
          <div style={{ fontSize: 200, color: props.brandAccent, lineHeight: 0.4, marginBottom: 16 }}>"</div>
          <div style={{ fontSize: 42, lineHeight: 1.4, fontStyle: 'italic' }}>{props.testimonialHi ?? props.testimonial}</div>
          {props.testimonialHi && <div style={{ fontSize: 26, opacity: 0.6, marginTop: 16 }}>{props.testimonial}</div>}
        </div>
        <div style={{ padding: '20px 32px', background: props.brandAccent, color: props.brandPrimary, borderRadius: 12, fontWeight: 700, fontSize: 32, alignSelf: 'flex-start' }}>{props.projectName}</div>
      </div>
      <Watermark text={props.projectName} />
    </AbsoluteFill>
  );
};
