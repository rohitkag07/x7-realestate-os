import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';
import { Watermark } from '../components/Watermark';
export const propsSchemaConstruction = z.object({
  projectName: z.string(), weekNumber: z.number().int().min(1).default(12), photos: z.array(z.string()).default([]),
  brandPrimary: z.string().default('#0F172A'), brandAccent: z.string().default('#F59E0B'), highlights: z.array(z.string()).default([]),
});
export const defaultConstructionProps: z.infer<typeof propsSchemaConstruction> = {
  projectName: 'Krishna Greens', weekNumber: 12, photos: [], brandPrimary: '#0F172A', brandAccent: '#F59E0B',
  highlights: ['Block A foundation complete', 'Internal roads laid', 'Club house structure up'],
};
export const ConstructionUpdate: React.FC<z.infer<typeof propsSchemaConstruction>> = (props) => {
  const frame = useCurrentFrame(); const { durationInFrames } = useVideoConfig();
  const count = Math.max(props.photos.length, 1);
  const idx = Math.min(Math.floor(frame / Math.floor(durationInFrames / count)), count - 1);
  const photo = props.photos[idx];
  return (
    <AbsoluteFill style={{ background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {photo ? <Img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} /> : <AbsoluteFill style={{ background: `linear-gradient(135deg, ${props.brandPrimary}, ${props.brandAccent}40)` }} />}
      <AbsoluteFill style={{ padding: 64, justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 999, background: props.brandAccent, color: props.brandPrimary, fontWeight: 800, fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>Week {props.weekNumber} Update</div>
          <div style={{ fontSize: 72, fontWeight: 800, marginTop: 32, textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>{props.projectName}</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 16, padding: 32 }}>
          {props.highlights.map((h, i) => {
            const op = interpolate(frame, [i * 30, i * 30 + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: op, marginBottom: 12, fontSize: 32 }}><span style={{ color: props.brandAccent }}>✓</span><span>{h}</span></div>;
          })}
        </div>
      </AbsoluteFill>
      <Watermark text={props.projectName} />
    </AbsoluteFill>
  );
};
