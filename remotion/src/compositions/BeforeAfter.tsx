import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { Watermark } from '../components/Watermark';
export const propsSchemaBeforeAfter = z.object({
  beforeImage: z.string().optional(), afterImage: z.string().optional(), projectName: z.string(),
  beforeLabel: z.string().default('Then'), afterLabel: z.string().default('Now'),
  brandPrimary: z.string().default('#0F172A'), brandAccent: z.string().default('#F59E0B'),
});
export const defaultBeforeAfterProps: z.infer<typeof propsSchemaBeforeAfter> = { projectName: 'Krishna Greens', beforeLabel: '6 months ago', afterLabel: 'Today', brandPrimary: '#0F172A', brandAccent: '#F59E0B' };
export const BeforeAfter: React.FC<z.infer<typeof propsSchemaBeforeAfter>> = (props) => {
  const frame = useCurrentFrame(); const { durationInFrames } = useVideoConfig();
  const split = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      {props.afterImage ? <Img src={props.afterImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <AbsoluteFill style={{ background: `linear-gradient(135deg, ${props.brandPrimary}, ${props.brandAccent})` }} />}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 80 }}><div style={{ background: props.brandAccent, color: props.brandPrimary, padding: '12px 32px', borderRadius: 999, fontWeight: 800, fontSize: 36 }}>{props.afterLabel}</div></AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        {props.beforeImage ? <Img src={props.beforeImage} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.7) brightness(0.7)' }} /> : <AbsoluteFill style={{ background: '#1f2937' }} />}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 80 }}><div style={{ background: '#fff', color: props.brandPrimary, padding: '12px 32px', borderRadius: 999, fontWeight: 800, fontSize: 36 }}>{props.beforeLabel}</div></AbsoluteFill>
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${split}%`, width: 4, background: '#fff', boxShadow: '0 0 32px rgba(255,255,255,0.8)' }} />
      <div style={{ position: 'absolute', top: 48, left: 0, right: 0, textAlign: 'center', fontSize: 56, fontWeight: 800, textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>{props.projectName}</div>
      <Watermark text={props.projectName} />
    </AbsoluteFill>
  );
};
