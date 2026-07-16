import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bg, isSuccessfulResponseWithData } from '../../shared/messaging';
import type { TelemetryData } from '../../shared/messaging';
import type { MemoryEntry, Variable, SavedPrompt, Folder, PromptVersion, CustomChip, ABTest, BrandVoice } from '../../shared/db';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusIcon, FolderIcon, ChevronRightIcon, ChevronDownIcon, SearchIcon, Edit3Icon, HistoryIcon, Undo2Icon } from 'lucide-react';

type Tab = 'prompts' | 'memory' | 'variables' | 'abtest' | 'review' | 'brandvoice' | 'team';

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

function isFolderArray(data: unknown): data is Folder[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'name' in item);
}
function isABTestArray(data: unknown): data is ABTest[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'promptA' in item && 'promptB' in item);
}
function isCustomChipArray(data: unknown): data is CustomChip[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'name' in item && 'instruction' in item);
}
function isPromptVersionArray(data: unknown): data is PromptVersion[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'promptId' in item && 'version' in item);
}
function isBrandVoiceArray(data: unknown): data is BrandVoice[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'name' in item && 'domain' in item);
}
function isTeamMemberArray(data: unknown): data is import('../../shared/db').TeamMember[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'email' in item);
}
function isSharedFolderArray(data: unknown): data is import('../../shared/db').SharedFolder[] {
  return Array.isArray(data) && data.every(item => typeof item === 'object' && item !== null && 'id' in item && 'name' in item);
}

const tabItems: { id: Tab; label: string }[] = [
  { id: 'memory', label: 'Memory' },
  { id: 'variables', label: 'Variables' },
  { id: 'prompts', label: 'Saved' },
  { id: 'abtest', label: 'A/B' },
  { id: 'brandvoice', label: 'Voice' },
  { id: 'team', label: 'Team' },
  { id: 'review', label: 'Review' },
];

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Folder tree helpers ──

type TreeNode = Folder & { children: TreeNode[]; depth: number };

function buildTree(folders: Folder[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];
  for (const f of folders) map.set(f.id, { ...f, children: [], depth: 0 });
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId !== null && map.has(f.parentId)) {
      const parent = map.get(f.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ── Dialog: Add Folder ──

function FolderDialog({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    await bg({ type: 'saveFolder', name: name.trim(), parentId: null });
    setName('');
    setOpen(false);
    onDone();
  };

  return (
    <>
      <Button size="xs" variant="ghost" onClick={() => setOpen(true)} aria-label="New folder">
        <FolderIcon className="mr-1 size-3" /> Folder
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <Input placeholder="Folder name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Folder name" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Dialog: Add Prompt ──

function PromptDialog({ folders, onDone }: { folders: Folder[]; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!title.trim() || !content.trim()) return;
    await bg({ type: 'savePrompt', title: title.trim(), content: content.trim(), folderId });
    setTitle('');
    setContent('');
    setFolderId(null);
    setOpen(false);
    onDone();
  };

  return (
    <>
      <Button size="xs" onClick={() => setOpen(true)} aria-label="New prompt">
        <PlusIcon className="mr-1 size-3" /> Prompt
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save Prompt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Prompt title" />
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Prompt content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Prompt content"
            />
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
              aria-label="Folder"
            >
              <option value="">No folder</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Rename Folder Dialog ──

function RenameDialog({ folder, onDone }: { folder: Folder; onDone: () => void }) {
  const [name, setName] = useState(folder.name);
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    await bg({ type: 'renameFolder', id: folder.id, name: name.trim() });
    setOpen(false);
    onDone();
  };

  return (
    <>
      <button
        className="w-full px-2 py-1 text-left text-xs hover:bg-muted"
        onClick={() => setOpen(true)}
      >Rename</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Folder</DialogTitle></DialogHeader>
          <Input placeholder="Folder name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Folder name" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Dialog: Add Variable ──

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
      <Button size="icon" className="fixed bottom-4 right-4 z-10 size-11 rounded-full shadow-lg" onClick={() => setOpen(true)} aria-label="Add new variable">
        <PlusIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Variable</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name (e.g. my_name)" value={key} onChange={(e) => setKey(e.target.value)} aria-label="Variable name" />
            <Input placeholder="Value" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Variable value" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} aria-label="Cancel adding variable">Cancel</Button>
            <Button onClick={save} aria-label="Save new variable">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Folder Tree Component ──

function FolderTree({
  nodes,
  selectedId,
  onSelect,
  onRename,
  onDelete,
}: {
  nodes: TreeNode[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onRename: (f: Folder) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [menuFolder, setMenuFolder] = useState<Folder | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const closeMenu = () => { setMenuFolder(null); setMenuPos(null); };

  const renderNode = (node: TreeNode) => (
    <div key={node.id}>
      <div
        className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs ${selectedId === node.id ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`}
        style={{ paddingLeft: `${8 + node.depth * 16}px` }}
        onClick={() => onSelect(node.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuFolder({ id: node.id, name: node.name, parentId: node.parentId, sortOrder: node.sortOrder, createdAt: node.createdAt });
          setMenuPos({ x: e.clientX, y: e.clientY });
        }}
      >
        {node.children.length > 0 ? (
          <span className="size-4 shrink-0" onClick={(e) => { e.stopPropagation(); toggle(node.id); }}>
            {expanded.has(node.id) ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
          </span>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </div>
      {expanded.has(node.id) && node.children.length > 0 && (
        <div>{node.children.map(renderNode)}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-0.5" onClick={closeMenu}>
      <div
        className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs ${selectedId === null ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`}
        onClick={() => onSelect(null)}
      >
        <span className="size-4 shrink-0" />
        <span className="font-medium">All Prompts</span>
      </div>
      {nodes.map(renderNode)}

      {menuFolder && menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            className="fixed z-50 min-w-[120px] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              className="flex w-full items-center px-2 py-1.5 text-xs hover:bg-muted"
              onClick={() => { onRename(menuFolder); closeMenu(); }}
            >Rename</button>
            <button
              className="flex w-full items-center px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => { onDelete(menuFolder.id); closeMenu(); }}
            >Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Dialog: Edit Prompt ──

function EditPromptDialog({ prompt, folders, onDone }: { prompt: SavedPrompt; folders: Folder[]; onDone: () => void }) {
  const [title, setTitle] = useState(prompt.title);
  const [content, setContent] = useState(prompt.content);
  const [folderId, setFolderId] = useState(prompt.folderId);
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!title.trim() || !content.trim()) return;
    await bg({ type: 'updatePrompt', id: prompt.id, title: title.trim(), content: content.trim(), folderId });
    setOpen(false);
    onDone();
  };

  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)} aria-label={'Edit prompt ' + (prompt.title || 'Untitled')}>
        <Edit3Icon className="size-3" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Prompt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Prompt title" />
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Prompt content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Prompt content"
            />
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
              aria-label="Folder"
            >
              <option value="">No folder</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Dialog: Version History ──

function VersionHistoryDialog({ promptId, onRollback }: { promptId: number; onRollback: () => void }) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await bg({ type: 'listPromptVersions', promptId });
    if (isSuccessfulResponseWithData(r, isPromptVersionArray)) setVersions(r.data);
    setLoading(false);
  };

  const rollback = async (v: PromptVersion) => {
    await bg({ type: 'rollbackPrompt', promptId, versionId: v.id });
    setOpen(false);
    onRollback();
  };

  useEffect(() => { if (open) load(); }, [open]);

  function diffLines(a: string, b: string) {
    const al = a.split('\n');
    const bl = b.split('\n');
    const maxLen = Math.max(al.length, bl.length);
    const lines: { type: 'same' | 'removed' | 'added'; text: string }[] = [];
    for (let i = 0; i < maxLen; i++) {
      if (i >= al.length) {
        lines.push({ type: 'added', text: bl[i] });
      } else if (i >= bl.length) {
        lines.push({ type: 'removed', text: al[i] });
      } else if (al[i] !== bl[i]) {
        lines.push({ type: 'removed', text: al[i] });
        lines.push({ type: 'added', text: bl[i] });
      } else {
        lines.push({ type: 'same', text: al[i] });
      }
    }
    return lines;
  }

  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setOpen(true)} aria-label="Version history">
        <HistoryIcon className="size-3" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && versions.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No version history yet.</p>
          )}
          {!loading && versions.length > 0 && (
            <div className="space-y-2">
              {[...versions].reverse().map((v, i) => {
                const prev = i + 1 < versions.length ? versions[versions.length - 1 - (i + 1)] : null;
                return (
                <div key={v.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">v{v.version} — {v.title}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(v.createdAt)}</p>
                      <button
                        className="mt-1 text-left text-[10px] text-muted-foreground/60 hover:text-foreground line-clamp-2"
                        onClick={() => setSelectedVersion(selectedVersion?.id === v.id ? null : v)}
                      >
                        {v.content.slice(0, 200)}{v.content.length > 200 ? '...' : ''}
                      </button>
                    </div>
                    <Button variant="outline" size="xs" onClick={() => rollback(v)}>
                      <Undo2Icon className="mr-1 size-3" /> Rollback
                    </Button>
                  </div>
                  {selectedVersion?.id === v.id && (
                    <div className="mt-2 border-t border-border pt-2">
                      {prev && (
                        <div className="mb-2">
                          <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Diff against v{prev.version}</p>
                          <div className="max-h-40 overflow-y-auto rounded bg-muted/30 p-2 font-mono text-[10px] leading-relaxed">
                            {diffLines(prev.content, v.content).map((line, li) => (
                              <div key={li} className={
                                line.type === 'removed' ? 'bg-red-900/20 text-red-400' :
                                line.type === 'added' ? 'bg-green-900/20 text-green-400' : ''
                              }>
                                {line.type === 'removed' ? '- ' : line.type === 'added' ? '+ ' : '  '}{line.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[10px] text-muted-foreground">{v.content}</pre>
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Dialog: Custom Chip ──

function ChipDialog({ edit, onDone }: { edit?: CustomChip; onDone: () => void }) {
  const [name, setName] = useState(edit?.name ?? '');
  const [label, setLabel] = useState(edit?.label ?? '');
  const [instruction, setInstruction] = useState(edit?.instruction ?? '');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || !label.trim() || !instruction.trim()) return;
    setError(null);
    const r = edit
      ? await bg({ type: 'updateCustomChip', id: edit.id, name: name.trim(), label: label.trim(), instruction: instruction.trim() })
      : await bg({ type: 'saveCustomChip', name: name.trim(), label: label.trim(), instruction: instruction.trim() });
    if (!r.ok) { setError(r.error); return; }
    setName(''); setLabel(''); setInstruction('');
    setOpen(false);
    onDone();
  };

  return (
    <>
      <Button size="xs" onClick={() => setOpen(true)} aria-label={edit ? 'Edit chip' : 'New chip'}>
        <PlusIcon className="mr-1 size-3" /> {edit ? 'Edit' : 'Chip'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? 'Edit' : 'New'} Custom Chip</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Internal name (e.g. summarize)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Chip name" />
            <Input placeholder="Button label (e.g. Summarize)" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Chip label" />
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="AI instruction for this chip..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              aria-label="Chip instruction"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{edit ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Dialog: Brand Voice ──

function BrandVoiceDialog({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [tone, setTone] = useState('');
  const [vocabulary, setVocabulary] = useState('');
  const [rules, setRules] = useState('');
  const [examples, setExamples] = useState('');
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!name.trim() || !domain.trim() || !tone.trim()) return;
    await bg({
      type: 'saveBrandVoice',
      name: name.trim(),
      domain: domain.trim(),
      tone: tone.trim(),
      vocabulary: vocabulary.split('\n').map(s => s.trim()).filter(Boolean),
      rules: rules.split('\n').map(s => s.trim()).filter(Boolean),
      examples: examples.split('\n').map(s => s.trim()).filter(Boolean),
    });
    setName(''); setDomain(''); setTone(''); setVocabulary(''); setRules(''); setExamples('');
    setOpen(false);
    onDone();
  };

  const textarea = 'min-h-[60px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

  return (
    <>
      <Button size="xs" onClick={() => setOpen(true)}>
        <PlusIcon className="mr-1 size-3" /> New Voice
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Brand Voice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Voice name (e.g. Professional)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Voice name" />
            <Input placeholder="Domain (e.g. chatgpt.com)" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Domain" />
            <Input placeholder="Tone (e.g. friendly, authoritative)" value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Tone" />
            <textarea className={textarea} placeholder="Vocabulary (one per line)" value={vocabulary} onChange={(e) => setVocabulary(e.target.value)} aria-label="Vocabulary" />
            <textarea className={textarea} placeholder="Rules (one per line)" value={rules} onChange={(e) => setRules(e.target.value)} aria-label="Rules" />
            <textarea className={textarea} placeholder="Examples (one per line)" value={examples} onChange={(e) => setExamples(e.target.value)} aria-label="Examples" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Dialog: A/B Test ──

function ABTestDialog({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [variables, setVariables] = useState('');
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!name.trim() || !promptA.trim() || !promptB.trim()) return;
    await bg({ type: 'createABTest', name: name.trim(), promptA: promptA.trim(), promptB: promptB.trim(), variables: variables.trim() });
    setName(''); setPromptA(''); setPromptB(''); setVariables('');
    setOpen(false);
    onDone();
  };

  return (
    <>
      <Button size="xs" onClick={() => setOpen(true)}>
        <PlusIcon className="mr-1 size-3" /> New Test
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New A/B Test</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Test name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Test name" />
            <textarea className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="Prompt A..." value={promptA} onChange={(e) => setPromptA(e.target.value)} aria-label="Prompt A" />
            <textarea className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="Prompt B..." value={promptB} onChange={(e) => setPromptB(e.target.value)} aria-label="Prompt B" />
            <Input placeholder="Variables (optional, e.g. audience=developers)" value={variables} onChange={(e) => setVariables(e.target.value)} aria-label="Variables" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main App ──

export function App() {
  const [tab, setTab] = useState<Tab>('memory');
  const [vars, setVars] = useState<Variable[]>([]);
  const [memStats, setMemStats] = useState<{ total: number; weekly: number; byAction: Record<string, number> }>({ total: 0, weekly: 0, byAction: {} });
  const [recentMem, setRecentMem] = useState<MemoryEntry[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chips, setChips] = useState<CustomChip[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [contextFolder, setContextFolder] = useState<Folder | null>(null);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [autoSend, setAutoSend] = useState(false);
  const [stalePrompts, setStalePrompts] = useState<SavedPrompt[]>([]);
  const [staleMemory, setStaleMemory] = useState<MemoryEntry[]>([]);
  const [pendingReview, setPendingReview] = useState(false);
  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([]);
  const [teamMembers, setTeamMembers] = useState<import('../../shared/db').TeamMember[]>([]);
  const [sharedFolders, setSharedFolders] = useState<import('../../shared/db').SharedFolder[]>([]);
  const [reviewEnabled, setReviewEnabled] = useState(true);

  const loadFolderData = async () => {
    const [fr, pr, cr] = await Promise.all([
      bg({ type: 'listFolders' }),
      bg({ type: 'listSavedPrompts' }),
      bg({ type: 'listCustomChips' }),
    ]);
    if (isSuccessfulResponseWithData(fr, isFolderArray)) setFolders(fr.data);
    if (isSuccessfulResponseWithData(pr, isSavedPromptArray)) setPrompts(pr.data);
    if (isSuccessfulResponseWithData(cr, isCustomChipArray)) setChips(cr.data);
  };

  const loadTab = async (t: Tab) => {
    if (t === 'variables') {
      const r = await bg({ type: 'listVariables' });
      if (isSuccessfulResponseWithData(r, isVariableArray)) setVars(r.data);
    }
    if (t === 'memory') {
      const [sr, tr, mr, asr] = await Promise.all([
        bg({ type: 'getMemoryStats' }),
        bg({ type: 'getTelemetry' }),
        bg({ type: 'listRecentMemory', limit: 10 }),
        bg({ type: 'getSetting', key: 'auto_send' }),
      ]);
      if (isSuccessfulResponseWithData(sr, isMemoryStats)) {
        const { total, weekly, byAction } = sr.data;
        setMemStats({ total, weekly, byAction });
      }
      if (isSuccessfulResponseWithData(tr, isTelemetryData)) setTelemetry(tr.data);
      if (isSuccessfulResponseWithData(mr, isMemoryEntryArray)) setRecentMem(mr.data);
      if (asr.ok) setAutoSend(String((asr as any).data ?? '') === 'true');
    }
    if (t === 'prompts') {
      await loadFolderData();
    }
    if (t === 'abtest') {
      const r = await bg({ type: 'listABTests' });
      if (isSuccessfulResponseWithData(r, isABTestArray)) setAbTests(r.data);
    }
    if (t === 'brandvoice') {
      const r = await bg({ type: 'listBrandVoices' });
      if (isSuccessfulResponseWithData(r, isBrandVoiceArray)) setBrandVoices(r.data);
    }
    if (t === 'team') {
      const [mr, fr] = await Promise.all([
        bg({ type: 'listTeamMembers' }),
        bg({ type: 'listSharedFolders' }),
      ]);
      if (isSuccessfulResponseWithData(mr, isTeamMemberArray)) setTeamMembers(mr.data);
      if (isSuccessfulResponseWithData(fr, isSharedFolderArray)) setSharedFolders(fr.data);
    }
    if (t === 'review') {
      const [staleR, staleM, pendingR, enabledR] = await Promise.all([
        bg({ type: 'getStalePrompts', days: 30 }),
        bg({ type: 'getStaleMemory', days: 30 }),
        bg({ type: 'getReviewStatus' }),
        bg({ type: 'getSetting', key: 'reviewEnabled' }),
      ]);
      if (staleR.ok) setStalePrompts((staleR.data as SavedPrompt[]) || []);
      if (staleM.ok) setStaleMemory((staleM.data as MemoryEntry[]) || []);
      if (pendingR.ok) setPendingReview((pendingR.data as { pending: boolean }).pending);
      if (enabledR.ok) setReviewEnabled((enabledR.data as string) !== 'false');
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

  // Filter prompts by selected folder and search
  const filteredPrompts = prompts.filter((p) => {
    if (selectedFolder !== null && p.folderId !== selectedFolder) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    }
    return true;
  });

  const tree = buildTree(folders);
  const flatFolders = folders; // for dialog select

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground" style={{ overflowY: 'auto', scrollbarGutter: 'stable' }}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex flex-1 flex-col">
        <TabsList className="sticky top-0 z-10 mx-3 mt-2 w-auto self-stretch justify-center">
          {tabItems.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="flex-1 relative">{t.label}{t.id === 'review' && pendingReview && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive" />}</TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="flex-1 px-3 pb-4 pt-3"
          >
            <TabsContent value="memory" className="m-0 space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoSend}
                        onChange={async (e) => {
                          const v = e.target.checked ? 'true' : 'false';
                          await bg({ type: 'setSetting', key: 'auto_send', value: v });
                          setAutoSend(e.target.checked);
                        }}
                        className="size-4 accent-primary"
                      />
                      <span>Auto-send on Accept</span>
                    </label>
                  </CardDescription>
                </CardHeader>
              </Card>
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
                      {telemetry.cacheHitCount ? ` · Cache hits: ${telemetry.cacheHitCount}` : ''}
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
                      <Button variant="destructive" size="xs" onClick={() => delVar(v.id)} aria-label={"Delete variable " + v.key}>Delete</Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
              <VarDialog onDone={() => loadTab('variables')} />
            </TabsContent>

            <TabsContent value="prompts" className="m-0">
              {/* Folder tree + toolbar */}
              <div className="mb-2 space-y-2">
                <FolderTree
                  nodes={tree}
                  selectedId={selectedFolder}
                  onSelect={setSelectedFolder}
                  onRename={setContextFolder}
                  onDelete={async (id) => { await bg({ type: 'deleteFolder', id }); loadFolderData(); }}
                />
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      placeholder="Search prompts..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search prompts"
                    />
                  </div>
                  <FolderDialog onDone={loadFolderData} />
                  <PromptDialog folders={flatFolders} onDone={loadFolderData} />
                </div>
              </div>

              {/* Prompt list */}
              {filteredPrompts.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {search ? 'No prompts match your search.' : selectedFolder !== null ? 'This folder is empty.' : 'No saved prompts yet.'}
                </p>
              )}
              <div className="space-y-1.5">
                {filteredPrompts.map((p) => (
                  <Card key={p.id}>
                    <CardHeader className="py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-sm">{p.title || 'Untitled'}</CardTitle>
                          <CardDescription className="line-clamp-2 text-xs">{p.content}</CardDescription>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/60">
                            {p.folderId !== null && (() => {
                              const f = folders.find((x) => x.id === p.folderId);
                              return f ? <span>{f.name}</span> : null;
                            })()}
                            <span>{formatDate(p.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <EditPromptDialog prompt={p} folders={flatFolders} onDone={loadFolderData} />
                          <VersionHistoryDialog promptId={p.id} onRollback={loadFolderData} />
                          <Button variant="ghost" size="xs" onClick={() => delPrompt(p.id)} aria-label={"Delete prompt " + (p.title || 'Untitled')}>Delete</Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {/* Custom chips */}
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">CUSTOM CHIPS</h3>
                  <ChipDialog onDone={loadFolderData} />
                </div>
                {chips.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">No custom chips yet. Max 5.</p>
                )}
                <div className="space-y-1">
                  {chips.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{c.label}</p>
                        <p className="truncate text-[10px] text-muted-foreground">/ {c.name}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ChipDialog edit={c} onDone={loadFolderData} />
                        <Button variant="destructive" size="xs" onClick={async () => { await bg({ type: 'deleteCustomChip', id: c.id }); loadFolderData(); }} aria-label={"Delete chip " + c.name}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="abtest" className="m-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">A/B TESTS</h3>
                <ABTestDialog onDone={() => loadTab('abtest')} />
              </div>
              {abTests.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No A/B tests yet.</p>
              )}
              <div className="space-y-2">
                {abTests.map((t) => (
                  <Card key={t.id}>
                    <CardHeader className="py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm">{t.name}</CardTitle>
                          <CardDescription className="text-[10px]">{formatDate(t.createdAt)}</CardDescription>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!t.resultA && (
                            <Button size="xs" onClick={async () => {
                              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                              const tab = tabs[0];
                              if (!tab?.id) return;
                              try {
                                const res = await chrome.tabs.sendMessage(tab.id, { type: 'glint:runABTest', promptA: t.promptA, promptB: t.promptB });
                                if (res?.ok && res.data) {
                                  await bg({ type: 'updateABTestResult', id: t.id, resultA: res.data.resultA, resultB: res.data.resultB });
                                  loadTab('abtest');
                                }
                              } catch {
                                alert('Open a supported chat page (ChatGPT, Claude, etc.) to run the test.');
                              }
                            }}>Run</Button>
                          )}
                          {t.winner && <span className="text-[10px] font-semibold text-emerald-400">Winner: {t.winner}</span>}
                          <Button variant="destructive" size="xs" onClick={async () => { await bg({ type: 'deleteABTest', id: t.id }); loadTab('abtest'); }}>Delete</Button>
                        </div>
                      </div>
                      {t.resultA && (
                        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2">
                          <div className={t.winner === 'A' ? 'ring-1 ring-emerald-500/30 rounded p-1.5' : 'p-1.5'}>
                            <p className="mb-1 text-[10px] font-semibold text-muted-foreground">A</p>
                            <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap text-[10px] text-muted-foreground">{t.resultA}</pre>
                            {!t.winner && <Button size="xs" className="mt-1" onClick={async () => { await bg({ type: 'markABTestWinner', id: t.id, winner: 'A' }); loadTab('abtest'); }}>Mark Winner</Button>}
                          </div>
                          <div className={t.winner === 'B' ? 'ring-1 ring-emerald-500/30 rounded p-1.5' : 'p-1.5'}>
                            <p className="mb-1 text-[10px] font-semibold text-muted-foreground">B</p>
                            <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap text-[10px] text-muted-foreground">{t.resultB}</pre>
                            {!t.winner && <Button size="xs" className="mt-1" onClick={async () => { await bg({ type: 'markABTestWinner', id: t.id, winner: 'B' }); loadTab('abtest'); }}>Mark Winner</Button>}
                          </div>
                        </div>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="brandvoice" className="m-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">BRAND VOICES</h3>
                <BrandVoiceDialog onDone={() => loadTab('brandvoice')} />
              </div>
              {brandVoices.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No brand voices yet.</p>
              )}
              <div className="space-y-2">
                {brandVoices.map((bv) => (
                  <Card key={bv.id}>
                    <CardHeader className="py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm">{bv.name}</CardTitle>
                          <CardDescription className="text-[10px]">{bv.domain} · {bv.tone}</CardDescription>
                          {bv.vocabulary.length > 0 && <p className="mt-1 text-[10px] text-muted-foreground">Vocab: {bv.vocabulary.join(', ')}</p>}
                          {bv.rules.length > 0 && <p className="text-[10px] text-muted-foreground">Rules: {bv.rules.join(', ')}</p>}
                        </div>
                        <Button variant="destructive" size="xs" onClick={async () => {
                          await bg({ type: 'deleteBrandVoice', id: bv.id });
                          setBrandVoices((prev) => prev.filter((x) => x.id !== bv.id));
                        }}>Delete</Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="team" className="m-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">TEAM</h3>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">MEMBERS</div>
                {teamMembers.length === 0 && <p className="text-sm text-muted-foreground">No team members.</p>}
                <div className="space-y-1">
                  {teamMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{m.email}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                      </div>
                      <Button variant="destructive" size="xs" onClick={async () => {
                        await bg({ type: 'removeTeamMember', id: m.id });
                        setTeamMembers((prev) => prev.filter((x) => x.id !== m.id));
                      }}>Remove</Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">SHARED FOLDERS</div>
                {sharedFolders.length === 0 && <p className="text-sm text-muted-foreground">No shared folders.</p>}
                <div className="space-y-1">
                  {sharedFolders.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <p className="text-xs font-medium">{f.name}</p>
                      <Button variant="destructive" size="xs" onClick={async () => {
                        await bg({ type: 'deleteSharedFolder', id: f.id });
                        setSharedFolders((prev) => prev.filter((x) => x.id !== f.id));
                      }}>Delete</Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="review" className="m-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">WEEKLY REVIEW</h3>
                {pendingReview && (
                  <Button size="xs" variant="ghost" onClick={async () => { await bg({ type: 'dismissReview' }); setPendingReview(false); }}>
                    Dismiss
                  </Button>
                )}
              </div>

              {stalePrompts.length === 0 && staleMemory.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">All caught up!</p>
              )}

              {stalePrompts.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold text-muted-foreground">PROMPTS NOT UPDATED IN 30+ DAYS</h4>
                    <Button size="xs" variant="ghost" onClick={async () => {
                      for (const p of stalePrompts) await bg({ type: 'deleteSavedPrompt', id: p.id });
                      setStalePrompts([]);
                    }}>Delete All</Button>
                  </div>
                  <div className="space-y-1">
                    {stalePrompts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{p.title}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{p.usageCount || 0} uses</p>
                        </div>
                        <Button variant="destructive" size="xs" onClick={async () => {
                          await bg({ type: 'deleteSavedPrompt', id: p.id });
                          setStalePrompts((prev) => prev.filter((x) => x.id !== p.id));
                        }}>Delete</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {staleMemory.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[11px] font-semibold text-muted-foreground">OLD MEMORY ENTRIES</h4>
                  <div className="space-y-1">
                    {staleMemory.map((m) => (
                      <div key={m.id} className="rounded-lg border border-border px-3 py-2">
                        <p className="line-clamp-2 text-xs">{m.content}</p>
                        <p className="text-[10px] text-muted-foreground">{m.action} · {new Date(m.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={reviewEnabled}
                    onChange={async (e) => {
                      const v = e.target.checked ? 'true' : 'false';
                      await bg({ type: 'setSetting', key: 'reviewEnabled', value: v });
                      setReviewEnabled(e.target.checked);
                    }}
                    className="size-4 accent-primary"
                  />
                  Enable weekly review reminders
                </label>
              </div>
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      {/* Context menu rename dialog */}
      {contextFolder && (
        <RenameDialog folder={contextFolder} onDone={() => { setContextFolder(null); loadFolderData(); }} />
      )}
    </div>
  );
}
