import type { ChipAction } from '../ai';

type Props = {
  anchor: HTMLElement;
  generate: (action: ChipAction, text: string) => Promise<string>;
};

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

const chips: { label: string; action: ChipAction }[] = [
  { label: 'Improve', action: 'improve' },
  { label: 'Concise', action: 'concise' },
  { label: 'Add Context', action: 'addContext' },
  { label: 'Format', action: 'format' },
];

function readInput(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
  return el.textContent ?? '';
}

function writeInput(el: HTMLElement, text: string) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.value = text;
  } else {
    el.textContent = text;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function ChipBar({ anchor, generate }: Props) {
  const handleClick = async (action: ChipAction) => {
    const text = readInput(anchor);
    if (!text.trim()) return;
    const result = await generate(action, text);
    writeInput(anchor, result);
  };

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
      {chips.map(({ label, action }) => (
        <button key={action} type="button" style={btn} onClick={() => handleClick(action)}>
          {label}
        </button>
      ))}
    </div>
  );
}
