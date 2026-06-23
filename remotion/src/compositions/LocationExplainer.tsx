import { z } from 'zod';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { LocationPin } from '../components/LocationPin';
import { Watermark } from '../components/Watermark';
export const propsSchemaLocation = z.object({
  projectName: z.string(), cityName: z.string(),
  landmarks: z.array(z.object({ name: z.string(), type: z.enum(['airport','school','hospital','office','highway','metro','mall','other']), distanceKm: z.number() })).default([]),
  brandPrimary: z.string().default('#0F172A'), brandAccent: z.string().default('#F59E0B'),
});
export const defaultLocationProps: z.infer<typeof propsSchemaLocation> = {
  projectName: 'Krishna Greens', cityName: 'Indore', brandPrimary: '#0F172A', brandAccent: '#F59E0B',
  landmarks: [{ name: 'Indore Airport', type: 'airport', distanceKm: 12 }, { name: 'IT Park', type: 'office', distanceKm: 3 }, { name: 'DPS School', type: 'school', distanceKm: 2.5 }, { name: 'Apollo Hospital', type: 'hospital', distanceKm: 4 }],
};
export const LocationExplainer: React.FC<z.infer<typeof propsSchemaLocation>> = (props) => {
  const frame = useCurrentFrame(); const { fps, durationInFrames } = useVideoConfig();
  const headerOpacity = spring({ frame, fps, durationInFrames: 20 });
  const slot = Math.floor((durationInFrames - fps * 3) / Math.max(props.landmarks.length, 1));
  return (
    <AbsoluteFill style={{ background: props.brandPrimary, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: 64, opacity: headerOpacity }}>
        <div style={{ fontSize: 32, color: props.brandAccent, letterSpacing: 2, textTransform: 'uppercase' }}>Location</div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 12 }}>{props.projectName}</div>
        <div style={{ fontSize: 32, opacity: 0.7, marginTop: 8 }}>{props.cityName}</div>
      </div>
      <div style={{ padding: '0 64px', flex: 1, display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'center' }}>
        {props.landmarks.map((l, i) => {
          const op = spring({ frame: frame - (fps * 2 + i * slot), fps, durationInFrames: 20 });
          const x = interpolate(op, [0, 1], [80, 0]);
          return (
            <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 32, transform: `translateX(${x}px)`, opacity: op, padding: '24px 32px', background: '#ffffff15', borderLeft: `8px solid ${props.brandAccent}`, borderRadius: 12 }}>
              <LocationPin type={l.type} color={props.brandAccent} />
              <div style={{ flex: 1, fontSize: 40, fontWeight: 700 }}>{l.name}</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: props.brandAccent }}>{l.distanceKm} km</div>
            </div>
          );
        })}
      </div>
      <Watermark text={props.projectName} />
    </AbsoluteFill>
  );
};
