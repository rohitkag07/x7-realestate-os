import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Watermark } from '../components/Watermark';
export const propsSchemaFestival = z.object({
  festival: z.enum(['diwali','holi','navratri','independence_day','republic_day','raksha_bandhan','dhanteras','akshaya_tritiya']),
  greetingHi: z.string(), greetingEn: z.string().optional(), projectName: z.string(), builderName: z.string(),
  offerText: z.string().optional(), brandPrimary: z.string().default('#0F172A'), brandAccent: z.string().default('#F59E0B'),
});
export const defaultFestivalProps: z.infer<typeof propsSchemaFestival> = {
  festival: 'diwali', greetingHi: 'दीपावली की हार्दिक शुभकामनाएं', greetingEn: 'Wishing you a prosperous Diwali',
  projectName: 'Krishna Greens', builderName: 'Shree Krishna Developers', offerText: 'Token ₹25,000 cashback this week',
  brandPrimary: '#7C2D12', brandAccent: '#FCD34D',
};
const THEMES: Record<string, { bg: string; emojis: string[] }> = {
  diwali: { bg: 'radial-gradient(circle, #7C2D12, #1c0a02)', emojis: ['🪔','✨','🎆'] },
  holi: { bg: 'linear-gradient(135deg, #ec4899, #f59e0b, #10b981, #3b82f6)', emojis: ['🌈','🎨','💐'] },
  navratri: { bg: 'radial-gradient(circle, #dc2626, #581c87)', emojis: ['💃','🎶','🌺'] },
  independence_day: { bg: 'linear-gradient(180deg, #f97316 33%, #ffffff 33% 66%, #16a34a 66%)', emojis: ['🇮🇳','🎊'] },
  republic_day: { bg: 'linear-gradient(180deg, #f97316 33%, #ffffff 33% 66%, #16a34a 66%)', emojis: ['🇮🇳','🎉'] },
  raksha_bandhan: { bg: 'linear-gradient(135deg, #fbbf24, #b91c1c)', emojis: ['🪢','💞'] },
  dhanteras: { bg: 'radial-gradient(circle, #ca8a04, #422006)', emojis: ['💰','🪔'] },
  akshaya_tritiya: { bg: 'radial-gradient(circle, #ca8a04, #422006)', emojis: ['🪙','🌾'] },
};
export const FestivalCreative: React.FC<z.infer<typeof propsSchemaFestival>> = (props) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const theme = THEMES[props.festival] ?? THEMES.diwali;
  const greet = spring({ frame, fps, durationInFrames: 30 });
  const offerOpacity = interpolate(frame, [fps * 2, fps * 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: theme.bg, color: '#fff', fontFamily: 'Inter, sans-serif', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 64 }}>
      {theme.emojis.map((e, i) => { const f = interpolate((frame + i * 20) % 90, [0, 90], [0, -40]); return <div key={i} style={{ position: 'absolute', left: `${20 + i * 30}%`, top: `${15 + i * 8}%`, fontSize: 100, transform: `translateY(${f}px) rotate(${i * 15}deg)`, opacity: 0.85 }}>{e}</div>; })}
      <div style={{ opacity: greet, transform: `scale(${0.5 + greet * 0.5})` }}>
        <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.1, textShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>{props.greetingHi}</div>
        {props.greetingEn && <div style={{ fontSize: 40, marginTop: 24, opacity: 0.85 }}>{props.greetingEn}</div>}
      </div>
      {props.offerText && <div style={{ marginTop: 64, opacity: offerOpacity, padding: '24px 48px', background: '#fff', color: props.brandPrimary, borderRadius: 16, fontWeight: 800, fontSize: 36, boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>🎁 {props.offerText}</div>}
      <div style={{ position: 'absolute', bottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 28, opacity: 0.7 }}>{props.builderName}</div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4, color: props.brandAccent }}>{props.projectName}</div>
      </div>
      <Watermark text={props.projectName} />
    </AbsoluteFill>
  );
};
