const btn: Record<string, string> = {
  padding: '4px 10px',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  background: '#f8f9fa',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  color: '#333',
  lineHeight: '20px',
};

const chips = ['Improve', 'Concise', 'Add Context', 'Format'];

export function ChipBar() {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '2px 8px',
        height: '36px',
        alignItems: 'center',
        background: '#ffffff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        borderRadius: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      {chips.map((label) => (
        <button key={label} type="button" style={btn}>
          {label}
        </button>
      ))}
    </div>
  );
}
