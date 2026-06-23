import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
export const Logo: React.FC<{ builderName: string; accent: string }> = ({ builderName, accent }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: `scale(${s})`, opacity: s, textAlign: 'center' }}>
        <div style={{ width: 220, height: 220, borderRadius: 32, background: accent, color: '#0F172A',
          fontWeight: 900, fontSize: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
          {builderName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 32, color: '#fff', letterSpacing: 2 }}>{builderName}</div>
      </div>
    </AbsoluteFill>
  );
};
