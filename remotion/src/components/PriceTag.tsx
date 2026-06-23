import { interpolate, useCurrentFrame } from 'remotion';
export const PriceTag: React.FC<{ start: number; end: number; durationFrames: number; accent: string }> = ({ start, end, durationFrames, accent }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const val = start + (end - start) * (1 - Math.pow(1 - t, 3));
  return <div style={{ padding: '24px 40px', borderRadius: 999, background: accent, color: '#0F172A', fontWeight: 900, fontSize: 64 }}>₹{val.toFixed(1)} L</div>;
};
