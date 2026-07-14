import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

type Props = {
  original: string;
  improved: string;
  onAccept: () => void;
  onReject: () => void;
};

export function DiffView({ original, improved, onAccept, onReject }: Props) {
  return (
    <motion.div
      className="border-t border-border bg-muted/40 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="mb-1.5">
        <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">ORIGINAL</div>
        <div className="max-h-20 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
          {original}
        </div>
      </div>
      <div className="mb-2">
        <div className="mb-1 text-[11px] font-semibold tracking-wide text-primary">IMPROVED</div>
        <div className="max-h-20 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-primary/10 px-2 py-1.5 text-xs leading-relaxed text-foreground">
          {improved}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="xs" onClick={onReject} aria-label="Reject prompt changes">Reject</Button>
        <Button variant="default" size="xs" onClick={onAccept} autoFocus aria-label="Accept prompt changes">Accept</Button>
      </div>
    </motion.div>
  );
}
