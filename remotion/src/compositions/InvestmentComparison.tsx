import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Watermark } from '../components/Watermark';
export const propsSchemaInvestment = z.object({
  projectName: z.string(), years: z.number().int().min(1).max(15).default(5),
  scenarios: z.array(z.object({ label: z.string(), finalMultiple: z.number(), color: z.string() })).default([
    { label: 'Plot (this project)', finalMultiple: 2.1, color: '#F59E0B' },
    { label: 'Apartment', finalMultiple: 1.45, color: '#3B82F6' },
    { label: 'FD', finalMultiple: 1.4, color: '#10B981' },
    { label: 'Gold', finalMultiple: 1.55, color: '#A855F7' },
  ]),
  brandPrimary: z.string().default('#0F172A'),
});
export const defaultInvestmentProps: z.infer<typeof propsSchemaInvestment> = {
  projectName: 'Krishna Greens', years: 5, brandPrimary: '#0F172A',
  scenarios: [{ label: 'Plot (this project)', finalMultiple: 2.1, color: '#F59E0B' }, { label: 'Apartment', finalMultiple: 1.45, color: '#3B82F6' }, { label: 'FD', finalMultiple: 1.4, color: '#10B981' }, { label: 'Gold', finalMultiple: 1.55, color: '#A855F7' }],
};
export const InvestmentComparison: React.FC<z.infer<typeof propsSchemaInvestment>> = (props) => {
  const frame = useCurrentFrame(); const { fps, durationInFrames } = useVideoConfig();
  const grow = interpolate(frame, [fps * 1, durationInFrames - fps * 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const max = Math.max(...props.scenarios.map((s) => s.finalMultiple));
  return (
    <AbsoluteFill style={{ background: '#fff', fontFamily: 'Inter, sans-serif', color: props.brandPrimary, padding: 64 }}>
      <div style={{ fontSize: 32, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>ROI Comparison</div>
      <div style={{ fontSize: 56, fontWeight: 800, marginTop: 8 }}>{props.years}-Year Returns</div>
      <div style={{ fontSize: 28, color: '#64748b', marginTop: 4 }}>₹10 Lakh invested</div>
      <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {props.scenarios.map((s) => (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, marginBottom: 8, fontWeight: 600 }}><span>{s.label}</span><span style={{ color: s.color, fontWeight: 800 }}>₹{(10 * s.finalMultiple).toFixed(1)} L</span></div>
            <div style={{ height: 48, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}><div style={{ height: '100%', width: `${(s.finalMultiple / max) * 100 * grow}%`, background: s.color, borderRadius: 8 }} /></div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', fontSize: 26, color: '#64748b' }}>* Past performance does not guarantee future returns.</div>
      <Watermark text={props.projectName} dark />
    </AbsoluteFill>
  );
};
