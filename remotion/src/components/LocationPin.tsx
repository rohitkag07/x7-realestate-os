const ICONS: Record<string, string> = { airport: '✈️', school: '🎓', hospital: '🏥', office: '🏢', highway: '🛣️', metro: '🚇', mall: '🛍️', other: '📍' };
export const LocationPin: React.FC<{ type: string; color: string }> = ({ type }) => (
  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ffffff20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>{ICONS[type] ?? ICONS.other}</div>
);
