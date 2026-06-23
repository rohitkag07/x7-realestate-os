import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Watermark } from '../components/Watermark';
export const propsSchemaPriceReveal = z.object({
  projectName: z.string(), startPrice: z.number().default(30), endPrice: z.number().default(18),
  tagline: z.string().default('Plots starting from'), brandPrimary: z.string().default('#0F172A'), brandAccent: z.string().default('#F59E0B'),
});
export const defaultPriceRevealProps: z.infer<typeof propsSchemaPriceReveal> = { projectName: 'Krishna Greens', startPrice: 30, endPrice: 18, tagline: 'Plots starting from', brandPrimary: '#0F172A', brandAccent: '#F59E0B' };
export const PriceReveal: React.FC<z.infer<typeof propsSchemaPriceReveal>> = (props) => {
  const frame = useCurrentFrame(); const { fps, durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [fps * 2, durationInFrames - fps * 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const value = props.startPrice + (props.endPrice - props.startPrice) * (1 - Math.pow(1 - t, 3));
  const tagOpacity = spring({ frame, fps, durationInFrames: 20 });
  const valueScale = interpolate(t, [0.9, 1], [1, 1.15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${props.brandPrimary} 0%, #000 80%)`, color: '#fff', fontFamily: 'Inter, sans-serif', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ opacity: tagOpacity, fontSize: 36, letterSpacing: 4, textTransform: 'uppercase', color: '#fff9' }}>{props.projectName.toUpperCase()}</div>
      <div style={{ opacity: tagOpacity, fontSize: 28, marginTop: 24, color: '#fffd' }}>{props.tagline}</div>
      <div style={{ marginTop: 48, transform: `scale(${valueScale})` }}>
        <div style={{ fontSize: 220, fontWeight: 900, background: `linear-gradient(180deg, ${props.brandAccent} 0%, #fff 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -8, lineHeight: 1 }}>₹{value.toFixed(1)}<span style={{ fontSize: 80 }}>L</span></div>
      </div>
      <div style={{ marginTop: 48, opacity: t > 0.95 ? 1 : 0 }}><div style={{ fontSize: 32, color: props.brandAccent, fontWeight: 700 }}>🔥 Limited time offer</div></div>
      <Watermark text={props.projectName} />
    </AbsoluteFill>
  );
};
