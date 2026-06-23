import { interpolate, useCurrentFrame } from 'remotion';
export const Captions: React.FC<{ captions: string[]; totalFrames: number }> = ({ captions, totalFrames }) => {
  const frame = useCurrentFrame();
  if (!captions.length) return null;
  const segment = totalFrames / captions.length;
  const idx = Math.min(Math.floor(frame / segment), captions.length - 1);
  const localT = (frame - idx * segment) / segment;
  const opacity = interpolate(localT, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 200, textAlign: 'center', padding: '0 64px', opacity }}>
      <div style={{ display: 'inline-block', padding: '12px 28px', background: 'rgba(0,0,0,0.7)', color: '#fff',
        fontSize: 36, fontWeight: 600, borderRadius: 8 }}>{captions[idx]}</div>
    </div>
  );
};
