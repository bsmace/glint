import { useEffect, useState } from 'preact/hooks';
import { bg } from '../../shared/messaging';

type Tab = 'prompts' | 'memory' | 'variables';

const tabs: { id: Tab; label: string }[] = [
  { id: 'prompts', label: 'Saved' },
  { id: 'memory', label: 'Memory' },
  { id: 'variables', label: 'Variables' },
];

type MemoryEntry = { id: number; content: string; expandedContent: string; action: string; url: string; createdAt: number };
type Variable = { id: number; key: string; value: string; description: string; createdAt: number; updatedAt: number };
type SavedPrompt = { id: number; title: string; content: string; folderId: number | null; createdAt: number; updatedAt: number; usageCount: number };

const s: Record<string, string | ((a: boolean) => string)> = {
  tabBar: 'display:flex;border-bottom:1px solid #ddd;background:#fff;position:sticky;top:0;z-index:1',
  item: 'padding:10px 14px;border-bottom:1px solid #eee',
  title: 'font-weight:600;margin-bottom:2px',
  sub: 'font-size:12px;color:#888',
  fab: 'position:fixed;bottom:16px;right:16px;width:44px;height:44px;border-radius:50%;background:#555;color:#fff;border:none;font-size:22px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2)',
  modal: 'position:fixed;inset:0;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;z-index:10',
  modalBody: 'background:#fff;border-radius:12px;padding:20px;width:300px',
  input: 'width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:8px;margin-bottom:8px;font-size:14px',
  btn: 'padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px',
};

function VarModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');

  const save = async () => {
    if (!key.trim() || !val.trim()) return;
    await bg({ type: 'saveVariable', key: key.trim(), value: val.trim(), description: '' });
    onClose();
  };

  return (
    <div style={s.modal as string} onClick={onClose}>
      <div style={s.modalBody as string} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 12 }}>Add Variable</h3>
        <input style={s.input as string} placeholder="Name (e.g. my_name)" value={key} onInput={(e) => setKey((e.target as HTMLInputElement).value)} />
        <input style={s.input as string} placeholder="Value" value={val} onInput={(e) => setVal((e.target as HTMLInputElement).value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={{ ...s.btn as any, background: '#eee' }} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btn as any, background: '#555', color: '#fff' }} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>('memory');
  const [vars, setVars] = useState<Variable[]>([]);
  const [mem, setMem] = useState<{ stats: { total: number; weekly: number; byAction: Record<string, number> }; recent: MemoryEntry[] }>({ stats: { total: 0, weekly: 0, byAction: {} }, recent: [] });
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [showVarModal, setShowVarModal] = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t: Tab) => {
    if (t === 'variables') {
      const r = await bg({ type: 'listVariables' });
      if (r.ok) setVars(r.data as Variable[]);
    }
    if (t === 'memory') {
      const sr = await bg({ type: 'getMemoryStats' });
      if (sr.ok) {
        const { total, weekly, byAction } = sr.data as any;
        setMem({ stats: { total, weekly, byAction }, recent: [] });
      }
    }
    if (t === 'prompts') {
      const r = await bg({ type: 'listSavedPrompts' });
      if (r.ok) setPrompts(r.data as SavedPrompt[]);
    }
  };

  const delVar = async (id: number) => {
    await bg({ type: 'deleteVariable', id });
    setVars((v) => v.filter((x) => x.id !== id));
  };

  return (
    <div>
      <div style={s.tabBar as string}>
        {tabs.map((t) => (
          <div key={t.id} style={{ flex: 1, textAlign: 'center', padding: '10px 0', cursor: 'pointer', fontWeight: tab === t.id ? 600 : 400, borderBottom: tab === t.id ? '2px solid #555' : '2px solid transparent', color: tab === t.id ? '#222' : '#666' }} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {tab === 'memory' && (
        <div>
          <div style={{ padding: '12px 14px', background: '#fff', borderBottom: '1px solid #eee' }}>
            <div style={s.title as string}>Memory Stats</div>
            <div style={s.sub as string}>Total: {mem.stats.total} · This week: {mem.stats.weekly}</div>
          </div>
          {mem.recent.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No entries yet.</div>}
        </div>
      )}

      {tab === 'variables' && (
        <div>
          {vars.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No variables yet.</div>}
          {vars.map((v) => (
            <div key={v.id} style={s.item as string}>
              <div style={s.title as string}>{'{{' + v.key + '}}'} = {v.value}</div>
              <div style={s.sub as string}>{v.description || '—'}</div>
              <button style={{ ...s.btn as any, background: '#e74c3c', color: '#fff', marginTop: 4 }} onClick={() => delVar(v.id)}>Delete</button>
            </div>
          ))}
          <button style={s.fab as string} onClick={() => setShowVarModal(true)}>+</button>
          {showVarModal && <VarModal onClose={() => { setShowVarModal(false); loadTab('variables'); }} />}
        </div>
      )}

      {tab === 'prompts' && (
        <div>
          {prompts.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No saved prompts yet.</div>}
          {prompts.map((p) => (
            <div key={p.id} style={s.item as string}>
              <div style={s.title as string}>{p.title || 'Untitled'}</div>
              <div style={s.sub as string}>{p.content.slice(0, 100)}{p.content.length > 100 ? '...' : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
