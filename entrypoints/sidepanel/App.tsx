import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bg, isSuccessfulResponseWithData } from '../../shared/messaging';
import type { TelemetryData } from '../../shared/messaging';
import type { MemoryEntry, Variable, SavedPrompt } from '../../shared/db';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

type Tab = 'prompts' | 'memory' | 'variables';

// Type guards for response data
function isVariableArray(data: unknown): data is Variable[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'key' in item);
}
function isSavedPromptArray(data: unknown): data is SavedPrompt[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'title' in item);
}
function isMemoryEntryArray(data: unknown): data is MemoryEntry[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'content' in item);
}
function isMemoryStats(data: unknown): data is { total: number; weekly: number; byAction: Record<string, number> } {
  return typeof data === 'object' && data !== null && 'total' in data && 'weekly' in data && 'byAction' in data;
}
function isTelemetryData(data: unknown): data is TelemetryData {
  return typeof data === 'object' && data !== null && 'detectByStrategy' in data && 'anchorReflowCount' in data && 'aiLatencyMs' in data;
}

const tabItems: { id: Tab; label: string }[] = [
  { id: 'memory', label: 'Memory' },
  { id: 'variables', label: 'Variables' },
  { id: 'prompts', label: 'Saved' },
];

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function VarDialog({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!key.trim() || !val.trim()) return;
    await bg({ type: 'saveVariable', key: key.trim(), value: val.trim(), description: '' });
    setKey('');
    setVal('');
    setOpen(false);
    onDone();
  };

  return (
    <>
      <Button 
        size="icon" 
        className="fixed bottom-4 right-4 z-10 size-11 rounded-full shadow-lg" 
        onClick={() => setOpen(true)}
        aria-label="Add new variable"
      >
        <PlusIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variable</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input 
              placeholder="Name (e.g. my_name)" 
              value={key} 
              onChange={(e) => setKey(e.target.value)} 
              aria-label="Variable name"
            />
            <Input 
              placeholder="Value" 
              value={val} 
              onChange={(e) => setVal(e.target.value)} 
              aria-label="Variable value"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setOpen(false)}
              aria-label="Cancel adding variable"
            >Cancel</Button>
            <Button 
              onClick={save}
              aria-label="Save new variable"
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>('memory');
  const [vars, setVars] = useState<Variable[]>([]);
  const [memStats, setMemStats] = useState<{ total: number; weekly: number; byAction: Record<string, number> }>({ total: 0, weekly: 0, byAction: {} });
  const [recentMem, setRecentMem] = useState<MemoryEntry[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);

  const loadTab = async (t: Tab) => {
    if (t === 'variables') {
      const r = await bg({ type: 'listVariables' });
      if (isSuccessfulResponseWithData(r, isVariableArray)) setVars(r.data);
    }
    if (t === 'memory') {
      const [sr, tr, mr] = await Promise.all([
        bg({ type: 'getMemoryStats' }),
        bg({ type: 'getTelemetry' }),
        bg({ type: 'listRecentMemory', limit: 10 }),
      ]);
      if (isSuccessfulResponseWithData(sr, isMemoryStats)) {
        const { total, weekly, byAction } = sr.data;
        setMemStats({ total, weekly, byAction });
      }
      if (isSuccessfulResponseWithData(tr, isTelemetryData)) setTelemetry(tr.data);
      if (isSuccessfulResponseWithData(mr, isMemoryEntryArray)) setRecentMem(mr.data);
    }
    if (t === 'prompts') {
      const r = await bg({ type: 'listSavedPrompts' });
      if (isSuccessfulResponseWithData(r, isSavedPromptArray)) setPrompts(r.data);
    }
  };

  useEffect(() => { loadTab(tab); }, [tab]);

  const delVar = async (id: number) => {
    await bg({ type: 'deleteVariable', id });
    setVars((v) => v.filter((x) => x.id !== id));
  };

  const delPrompt = async (id: number) => {
    await bg({ type: 'deleteSavedPrompt', id });
    setPrompts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex flex-1 flex-col">
        <TabsList className="sticky top-0 z-10 mx-3 mt-2 w-auto self-stretch justify-center">
          {tabItems.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="flex-1">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="flex-1 px-3 pb-4 pt-3"
          >
            <TabsContent value="memory" className="m-0 space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>Memory Stats</CardTitle>
                  <CardDescription>
                    Total: {memStats.total} · This week: {memStats.weekly}
                  </CardDescription>
                </CardHeader>
              </Card>

              {telemetry && (
                <Card>
                  <CardHeader>
                    <CardTitle>Telemetry</CardTitle>
                    <CardDescription>
                      Detects: {Object.entries(telemetry.detectByStrategy).map(([k, v]) => `${k}:${v}`).join(' · ')}
                    </CardDescription>
                    <CardDescription>
                      Reflows: {telemetry.anchorReflowCount}
                      {telemetry.aiLatencyMs.count > 0 && ` · AI avg: ${Math.round(telemetry.aiLatencyMs.total / telemetry.aiLatencyMs.count)}ms (${telemetry.aiLatencyMs.count} calls)`}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              {recentMem.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">RECENT</h3>
                  <div className="space-y-1.5">
                    {recentMem.map((m) => (
                      <Card key={m.id}>
                        <CardHeader className="py-2">
                          <CardDescription className="line-clamp-2 text-xs">{m.content}</CardDescription>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                            <span>{m.action}</span>
                            <span>{formatDate(m.createdAt)}</span>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {recentMem.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No entries yet.</p>
              )}
            </TabsContent>

            <TabsContent value="variables" className="m-0 space-y-2">
              {vars.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No variables yet.</p>
              )}
              {vars.map((v) => (
                <Card key={v.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate font-mono text-sm">{'{{' + v.key + '}}'} = {v.value}</CardTitle>
                        <CardDescription>{v.description || '—'}</CardDescription>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="xs" 
                        onClick={() => delVar(v.id)} 
                        aria-label={"Delete variable " + v.key}
                      >Delete</Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
              <VarDialog onDone={() => loadTab('variables')} />
            </TabsContent>

            <TabsContent value="prompts" className="m-0 space-y-2">
              {prompts.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No saved prompts yet.</p>
              )}
              {prompts.map((p) => (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-sm">{p.title || 'Untitled'}</CardTitle>
                        <CardDescription className="line-clamp-2">{p.content}</CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="xs" 
                        onClick={() => delPrompt(p.id)} 
                        aria-label={"Delete prompt " + (p.title || 'Untitled')}
                      >Delete</Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
