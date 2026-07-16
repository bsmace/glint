import { useRef, useState } from 'react';
import type { ChipAction, GenerateResult } from '../../../shared/ai';
import { Button } from '@/components/ui/button';
import { DiffView } from './DiffView';
import { triggerSend } from '../send';

export type CustomChipData = { id: number; name: string; label: string; instruction: string };

type Props = {
  anchor: HTMLElement;
  generate: (action: ChipAction, text: string, instruction?: string) => Promise<GenerateResult>;
  customChips?: CustomChipData[];
  onDevice?: boolean;
  aiAvailable?: boolean;
  autoSend?: boolean;
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

type DiffState = { original: string; improved: string; injected?: string };

export function ChipBar({ anchor, generate, customChips, onDevice, aiAvailable = true, autoSend = false, onDiffChange }: Props) {
  const [diff, setDiff] = useState<DiffState | null>(null);
  const [exiting, setExiting] = useState(false);
  const [exitingLock, setExitingLock] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const acceptRef = useRef<HTMLButtonElement | null>(null);
  const rejectRef = useRef<HTMLButtonElement | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const handleClick = async (action: ChipAction, instruction?: string) => {
    if (loading || exitingLock) return;
    if (!aiAvailable) { setError('AI is not available on this browser.'); return; }
    const text = readInput(anchor);
    if (!text.trim()) return;
    setError(null);
    const loadingKey = instruction ?? action;
    setLoading(loadingKey);
    setExiting(false);
    try {
      const { text: improved, injected } = await generate(action, text, instruction);
      setDiff({ original: text, improved, injected });
      onDiffChange?.(true);
    } catch {
      setError('AI generation failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const startExit = (cb: () => void) => {
    if (exitingLock) return;
    setExitingLock(true);
    setExiting(true);
    setTimeout(() => {
      setDiff(null);
      setExiting(false);
      setExitingLock(false);
      cb();
    }, 200);
  };

  const handleAccept = () => {
    if (!diff) return;
    const text = diff.improved;
    startExit(() => {
      writeInput(anchor, text);
      onDiffChange?.(false);
      if (autoSend) triggerSend(anchor);
    });
  };

  const handleReject = () => {
    startExit(() => onDiffChange?.(false));
  };

  const focusChip = (index: number) => {
    const btn = chipRefs.current[index];
    if (btn) { btn.focus(); setFocusIndex(index); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (exitingLock) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (diff) handleReject();
      return;
    }
    if (diff) {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (document.activeElement === acceptRef.current) rejectRef.current?.focus();
          else focusChip(0);
        } else {
          if (document.activeElement === rejectRef.current) acceptRef.current?.focus();
          else focusChip(0);
        }
        return;
      }
      return;
    }
    if (loading) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusChip((focusIndex + 1) % chips.length);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusChip((focusIndex - 1 + chips.length) % chips.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const activeIdx = chipRefs.current.findIndex(ref => ref === document.activeElement);
      if (activeIdx >= 0) {
        const defaultChips = chips.map((c, i) => ({ ...c, kind: 'default' as const, renderIndex: i }));
        const customChipItems = (customChips ?? []).map((c, i) => ({ kind: 'custom' as const, label: c.label, instruction: c.instruction, renderIndex: chips.length + i }));
        const allChips = [...defaultChips, ...customChipItems];
        if (activeIdx < allChips.length) {
          const chip = allChips[activeIdx];
          if (chip.kind === 'custom') handleClick('improve', chip.instruction);
          else handleClick(chip.action);
        }
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        focusChip((focusIndex - 1 + chips.length) % chips.length);
      } else {
        focusChip((focusIndex + 1) % chips.length);
      }
      return;
    }
  };

  return (
    <div
      className="min-w-[200px] overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-md"
      onKeyDown={handleKeyDown}
    >
      <div className="flex h-9 items-center gap-1 px-1.5 py-1" onMouseDown={(e) => e.preventDefault()} role="toolbar">
        {aiAvailable ? (() => {
          const defaultChips = chips.map((c, i) => ({ ...c, kind: 'default' as const, renderIndex: i }));
          const customChipItems = (customChips ?? []).map((c, i) => ({ kind: 'custom' as const, label: c.label, instruction: c.instruction, renderIndex: chips.length + i }));
          const allChips = [...defaultChips, ...customChipItems];
          return allChips.map((chip) => (
            <Button
              key={chip.renderIndex}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={loading !== null}
              onClick={() => chip.kind === 'custom' ? handleClick('improve', chip.instruction) : handleClick(chip.action)}
              aria-label={`${chip.label} prompt`}
              ref={el => { chipRefs.current[chip.renderIndex] = el; }}
            >
              {loading === (chip.kind === 'custom' ? chip.instruction : chip.action) ? '…' : chip.label}
            </Button>
          ));
        })() : (
          <span className="px-1.5 py-0.5 text-[11px] text-muted-foreground">AI unavailable on this browser</span>
        )}
        {onDevice && (
          <span className="ml-auto whitespace-nowrap rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
            On-device
          </span>
        )}
      </div>

      {error && (
        <div className="px-3 pb-2 text-xs text-destructive">{error}</div>
      )}

      {diff && (
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            maxHeight: exiting ? '0' : '300px',
            opacity: exiting ? 0 : 1,
          }}
        >
          <DiffView
            original={diff.original}
            improved={diff.improved}
            injected={diff.injected}
            onAccept={handleAccept}
            onReject={handleReject}
            acceptRef={acceptRef}
            rejectRef={rejectRef}
          />
        </div>
      )}
    </div>
  );
}
