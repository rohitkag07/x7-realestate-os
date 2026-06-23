import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
export const CTAButton: React.FC<{ label: string; subtext?: string; primary: string; accent: string }> = ({ label, subtext, primary, accent }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame, fps, durationInFrames: 30 });
  const pulse = 1 + Math.sin(frame / 5) * 0.03;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${primary}aa 0%, ${primary} 100%)`,
      alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', transform: `scale(${s * pulse})`, opacity: s }}>
        <div style={{ padding: '32px 64px', borderRadius: 999, background: accent, color: primary,
          fontWeight: 900, fontSize: 72, boxShadow: '0 16px 64px rgba(0,0,0,0.5)' }}>{label}</div>
        {subtext && <div style={{ marginTop: 32, fontSize: 36, color: '#fff', opacity: 0.85 }}>{subtext}</div>}
      </div>
    </AbsoluteFill>
  );
};
