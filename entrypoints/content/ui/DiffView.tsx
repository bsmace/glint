type Props = {
  original: string;
  improved: string;
  onAccept: () => void;
  onReject: () => void;
};

const sectionLabel: Record<string, string> = {
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.5px',
  marginBottom: '4px',
};

const sectionContent: Record<string, string> = {
  fontSize: '12px',
  lineHeight: '1.4',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: '80px',
  overflowY: 'auto',
  padding: '6px 8px',
  borderRadius: '6px',
};

const btn: Record<string, string> = {
  padding: '6px 14px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '500',
};

export function DiffView({ original, improved, onAccept, onReject }: Props) {
  return (
    <div
      style={{
        marginTop: '6px',
        padding: '8px 10px 10px',
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
      }}
      onKeyDown={(e) => { if (e.key === 'Escape') onReject(); }}
    >
      <div style={{ marginBottom: '6px' }}>
        <div style={{ ...sectionLabel, color: '#999' }}>ORIGINAL</div>
        <div style={{ ...sectionContent, background: '#f5f5f5', color: '#666' }}>{original}</div>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <div style={{ ...sectionLabel, color: '#2e7d32' }}>IMPROVED</div>
        <div style={{ ...sectionContent, background: '#f0faf0', color: '#222' }}>{improved}</div>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          autoFocus
          style={{ ...btn, background: '#2e7d32', color: '#fff' }}
          onClick={onAccept}
        >
          Accept
        </button>
        <button
          style={{ ...btn, background: '#eee', color: '#555' }}
          onClick={onReject}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
