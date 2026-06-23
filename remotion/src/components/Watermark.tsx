export const Watermark: React.FC<{ text: string; dark?: boolean }> = ({ text, dark }) => (
  <div style={{ position: 'absolute', bottom: 24, right: 32, padding: '6px 14px',
    background: dark ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)',
    color: dark ? '#475569' : '#fff', fontSize: 18, fontWeight: 600, letterSpacing: 1,
    borderRadius: 4, fontFamily: 'Inter, sans-serif' }}>{text}</div>
);
