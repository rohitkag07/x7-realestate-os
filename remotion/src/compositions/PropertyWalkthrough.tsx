import { z } from 'zod';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, Img } from 'remotion';
import { Logo } from '../components/Logo';
import { RERABadge } from '../components/RERABadge';
import { Captions } from '../components/Captions';
import { CTAButton } from '../components/CTAButton';
import { Watermark } from '../components/Watermark';

export const propsSchemaWalkthrough = z.object({
  projectName: z.string(), location: z.string(), builderName: z.string(),
  brandPrimary: z.string().default('#0F172A'), brandAccent: z.string().default('#F59E0B'),
  reraNumber: z.string().optional(), startingPrice: z.number().default(18),
  amenities: z.array(z.string()).default([]), heroImages: z.array(z.string()).default([]),
  whatsappNumber: z.string().optional(), captionsHi: z.array(z.string()).default([]),
});
export const defaultWalkthroughProps: z.infer<typeof propsSchemaWalkthrough> = {
  projectName: 'Krishna Greens', location: 'Super Corridor, Indore', builderName: 'Shree Krishna Developers',
  brandPrimary: '#0F172A', brandAccent: '#F59E0B', reraNumber: 'P-MP-IND-2026-00123', startingPrice: 18,
  amenities: ['Wide 40ft Roads', 'Garden', '24x7 Security'], heroImages: [], whatsappNumber: '+91 98765 43210',
  captionsHi: ['Aapke sapnon ka ghar', '40 feet wide roads, gated community', 'RERA approved, 120 plots', 'Plot dekhne ke liye WhatsApp karein'],
};
export const PropertyWalkthrough: React.FC<z.infer<typeof propsSchemaWalkthrough>> = (props) => {
  const { durationInFrames, fps } = useVideoConfig(); const frame = useCurrentFrame();
  const intro = spring({ frame, fps, config: { damping: 200 } });
  const heroFrames = Math.floor(durationInFrames * 0.55);
  const ctaFrames = Math.floor(durationInFrames * 0.2);
  return (
    <AbsoluteFill style={{ background: props.brandPrimary, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Sequence durationInFrames={Math.floor(fps * 2.5)}><Logo builderName={props.builderName} accent={props.brandAccent} /></Sequence>
      <Sequence from={Math.floor(fps * 2.5)} durationInFrames={heroFrames}>
        <AbsoluteFill>
          {props.heroImages.length > 0 ? (
            <Img src={props.heroImages[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
          ) : (
            <AbsoluteFill style={{ background: `linear-gradient(135deg, ${props.brandPrimary} 0%, ${props.brandAccent}40 100%)` }} />
          )}
          <AbsoluteFill style={{ padding: 96, justifyContent: 'flex-end', background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.65))' }}>
            <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: -2, opacity: intro }}>{props.projectName}</div>
            <div style={{ fontSize: 42, opacity: 0.85, marginTop: 16 }}>{props.location}</div>
            <div style={{ display: 'inline-block', marginTop: 32, padding: '16px 28px', background: props.brandAccent, color: props.brandPrimary, fontWeight: 700, fontSize: 36, borderRadius: 12, alignSelf: 'flex-start' }}>Plots from ₹{props.startingPrice} Lakh</div>
          </AbsoluteFill>
          {props.reraNumber && <RERABadge number={props.reraNumber} />}
          <Captions captions={props.captionsHi} totalFrames={heroFrames} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={Math.floor(fps * 2.5) + heroFrames} durationInFrames={ctaFrames}>
        <CTAButton label="WhatsApp Now" subtext={props.whatsappNumber ?? ''} accent={props.brandAccent} primary={props.brandPrimary} />
      </Sequence>
      <Watermark text={props.builderName} />
    </AbsoluteFill>
  );
};
