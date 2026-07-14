import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChipAction } from '../../../shared/ai';
import { Button } from '@/components/ui/button';
import { DiffView } from './DiffView';

type Props = {
  anchor: HTMLElement;
  generate: (action: ChipAction, text: string) => Promise<string>;
  onDevice?: boolean;
  onDiffChange?: (active: boolean) => void;
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

type DiffState = { original: string; improved: string };

export function ChipBar({ anchor, generate, onDevice, onDiffChange }: Props) {
  const [diff, setDiff] = useState<DiffState | null>(null);
  const [loading, setLoading] = useState<ChipAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (action: ChipAction) => {
    if (loading) return;
    const text = readInput(anchor);
    if (!text.trim()) return;
    setError(null);
    setLoading(action);
    try {
      const result = await generate(action, text);
      setDiff({ original: text, improved: result });
      onDiffChange?.(true);
    } catch {
      setError('AI generation failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleAccept = () => {
    if (!diff) return;
    writeInput(anchor, diff.improved);
    setDiff(null);
    onDiffChange?.(false);
  };

  const handleReject = () => {
    setDiff(null);
    onDiffChange?.(false);
  };

  return (
    <div
      className="min-w-[200px] overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && diff) {
          e.preventDefault();
          handleReject();
        }
      }}
    >
      <div className="flex h-9 items-center gap-1 px-1.5 py-1" onMouseDown={(e) => e.preventDefault()} role="toolbar">
        {chips.map(({ label, action }) => (
          <Button 
            key={action} 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground" 
            disabled={loading !== null} 
            onClick={() => handleClick(action)}
            aria-label={`${label} prompt`}
          >
            {loading === action ? '…' : label}
          </Button>
        ))}
        {onDevice && (
          <span className="ml-auto whitespace-nowrap rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
            On-device
          </span>
        )}
      </div>

      {error && (
        <div className="px-3 pb-2 text-xs text-destructive">{error}</div>
      )}

      <AnimatePresence>
        {diff && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <DiffView
              original={diff.original}
              improved={diff.improved}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
