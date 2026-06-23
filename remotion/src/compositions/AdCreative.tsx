import { z } from 'zod';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { CTAButton } from '../components/CTAButton';
export const propsSchemaAd = z.object({
  hook: z.string(), hookHi: z.string().optional(), offer: z.string(), projectName: z.string(),
  cta: z.string().default('WhatsApp Now'), whatsappNumber: z.string().optional(),
  brandPrimary: z.string().default('#0F172A'), brandAccent: z.string().default('#F59E0B'),
});
export const defaultAdProps: z.infer<typeof propsSchemaAd> = {
  hook: 'Plots from ₹18 Lakh in Super Corridor', hookHi: '₹18 Lakh se shuru — Super Corridor mein',
  offer: 'RERA approved · Last 12 plots', projectName: 'Krishna Greens', cta: 'WhatsApp Now',
  whatsappNumber: '+91 98765 43210', brandPrimary: '#0F172A', brandAccent: '#F59E0B',
};
export const AdCreative: React.FC<z.infer<typeof propsSchemaAd>> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const hookEnd = Math.floor(fps * 5); const offerEnd = Math.floor(fps * 10);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${props.brandPrimary} 0%, ${props.brandAccent}50 100%)`, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Sequence durationInFrames={hookEnd}><HookSlide hook={props.hookHi ?? props.hook} subhook={props.hookHi ? props.hook : null} /></Sequence>
      <Sequence from={hookEnd} durationInFrames={offerEnd - hookEnd}><OfferSlide offer={props.offer} projectName={props.projectName} accent={props.brandAccent} /></Sequence>
      <Sequence from={offerEnd} durationInFrames={durationInFrames - offerEnd}><CTAButton label={props.cta} subtext={props.whatsappNumber ?? ''} primary={props.brandPrimary} accent={props.brandAccent} /></Sequence>
    </AbsoluteFill>
  );
};
const HookSlide: React.FC<{ hook: string; subhook: string | null }> = ({ hook, subhook }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const s = spring({ frame, fps, durationInFrames: 25 });
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 64, textAlign: 'center' }}>
    <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.1, opacity: s, transform: `scale(${0.7 + s * 0.3})` }}>{hook}</div>
    {subhook && <div style={{ fontSize: 36, marginTop: 24, opacity: s * 0.8 }}>{subhook}</div>}
  </AbsoluteFill>;
};
const OfferSlide: React.FC<{ offer: string; projectName: string; accent: string }> = ({ offer, projectName, accent }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = interpolate(frame, [0, fps * 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 64, textAlign: 'center' }}>
    <div style={{ padding: '24px 48px', background: '#fff', color: '#0F172A', borderRadius: 24, fontWeight: 800, fontSize: 48, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>{offer}</div>
    <div style={{ marginTop: 40, fontSize: 56, fontWeight: 700, color: accent, opacity: t }}>{projectName}</div>
  </AbsoluteFill>;
};
