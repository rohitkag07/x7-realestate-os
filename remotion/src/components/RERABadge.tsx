export const RERABadge: React.FC<{ number: string }> = ({ number }) => (
  <div style={{ position: 'absolute', top: 32, right: 32, padding: '12px 24px',
    background: '#10b981', color: '#fff', borderRadius: 8, fontSize: 22, fontWeight: 700,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>RERA · {number}</div>
);
