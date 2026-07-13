"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  RefreshCw,
  Command,
  Search,
  SearchX,
  Mail,
  Calendar,
  FileText,
  HardDrive,
  Code2,
  Bot,
  Plus,
  ArrowUp,
  Play,
  Pause,
  Square,
  RotateCcw,
  FolderOpen,
  FileCode,
  FileJson,
  Folder,
  Lightbulb,
  GripVertical,
  Zap,
  PanelRightClose,
  PanelRightOpen,
  CircleCheck,
  CircleAlert,
  Terminal,
  CornerDownLeft,
} from "lucide-react"

/* ============================================================
   Glint OS — The Universal Skills Layer
   Single-file interactive prototype. Dark mode only.
   ============================================================ */

const SPRING = { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.7 }
const EASE = [0.16, 1, 0.3, 1] as const

type Mode = "improve" | "skills" | "agent" | "code" | "library"
type PromptState = "idle" | "streaming" | "done"
type AgentState = "idle" | "planning" | "awaiting" | "running" | "paused" | "done" | "error"

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "improve", label: "Improve", hint: "1" },
  { id: "skills", label: "Skills //", hint: "2" },
  { id: "agent", label: "Agent", hint: "3" },
  { id: "code", label: "Code", hint: "4" },
  { id: "library", label: "Library", hint: "5" },
]

type ModeMeta = { icon: React.ComponentType<{ className?: string }>; label: string; tag: string; tint: string; dot: string }
const MODE_META: Record<Mode, ModeMeta> = {
  improve: { icon: Sparkles, label: "Improve", tag: "PROMPT.REFINE", tint: "text-emerald-400", dot: "bg-emerald-500" },
  skills: { icon: Zap, label: "Skills", tag: "SKILL.INVOKE", tint: "text-blue-400", dot: "bg-blue-500" },
  agent: { icon: Bot, label: "Agent", tag: "AGENT.LOOP", tint: "text-blue-400", dot: "bg-blue-500" },
  code: { icon: Code2, label: "Code", tag: "CODE.PATCH", tint: "text-emerald-400", dot: "bg-emerald-500" },
  library: { icon: FileText, label: "Library", tag: "LIB.BROWSE", tint: "text-zinc-300", dot: "bg-zinc-400" },
}

/* ---------- tiny primitives ---------- */

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-[6px] border border-zinc-700 border-b-2 bg-zinc-800 px-1.5 font-mono text-[11px] font-medium text-zinc-400">
      {children}
    </kbd>
  )
}

const RING = "outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"

/* ============================================================
   Toasts
   ============================================================ */

type Toast = { id: number; message: string; action?: string }

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[70] flex w-[320px] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={SPRING}
            className="glint-shadow pointer-events-auto relative overflow-hidden rounded-[10px] border border-zinc-800/80 bg-zinc-900/90 px-3 py-2.5 backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-zinc-100">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => onDismiss(t.id)}
                  className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[12px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 ${RING}`}
                >
                  {t.action}
                </button>
              )}
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4, ease: "linear" }}
              style={{ transformOrigin: "left" }}
              className="absolute bottom-0 left-0 h-[2px] w-full bg-zinc-600"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   1. IMPROVE MODE
   ============================================================ */

const IMPROVE_STEPS = [
  { key: "miner", label: "Miner", sub: "Reading page context…" },
  { key: "architect", label: "Architect", sub: "Restructuring for clarity…" },
  { key: "critic", label: "Critic", sub: "Polishing final draft…" },
]

function ImproveIsland({
  state,
  activeStep,
  onStream,
  onAccept,
  onReset,
  onCopy,
}: {
  state: PromptState
  activeStep: number
  onStream: () => void
  onAccept: () => void
  onReset: () => void
  onCopy: () => void
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      layout
      transition={SPRING}
      className="glint-shadow w-[520px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[12px] border border-zinc-800/80 bg-zinc-900/85 backdrop-blur-2xl saturate-150 will-change-transform"
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="shrink-0 text-zinc-100"
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
            <div className="flex flex-1 items-center gap-2">
              <button
                onClick={onStream}
                className={`h-7 rounded-full bg-white px-3 text-[12px] font-medium text-zinc-950 transition-transform hover:-translate-y-px active:scale-[0.98] ${RING}`}
              >
                Outcome-first
              </button>
              <button
                className={`h-7 rounded-full bg-zinc-800 px-3 text-[12px] font-medium text-zinc-300 transition-transform hover:-translate-y-px hover:bg-zinc-700 active:scale-[0.98] ${RING}`}
              >
                Add audience
              </button>
              <button
                className={`h-7 rounded-full bg-zinc-800 px-3 text-[12px] font-medium text-zinc-300 transition-transform hover:-translate-y-px hover:bg-zinc-700 active:scale-[0.98] ${RING}`}
              >
                Add format
              </button>
            </div>
            <button
              onClick={onStream}
              aria-label="Expand"
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 ${RING}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {state === "streaming" && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="px-4 py-3.5"
          >
            <div className="flex items-center">
              {IMPROVE_STEPS.map((s, i) => {
                const done = i < activeStep
                const active = i === activeStep
                return (
                  <div key={s.key} className="flex flex-1 items-center last:flex-none">
                    <div className="flex items-center gap-2">
                      <div className="relative grid h-5 w-5 place-items-center">
                        {done ? (
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/20">
                            <Check className="h-3 w-3 text-emerald-400" />
                          </span>
                        ) : (
                          <motion.span
                            animate={active ? { scale: [1, 1.35, 1], opacity: [1, 0.5, 1] } : {}}
                            transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY }}
                            className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-zinc-600"}`}
                          />
                        )}
                      </div>
                      <span className={`text-[12px] font-medium ${done || active ? "text-zinc-100" : "text-zinc-500"}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < IMPROVE_STEPS.length - 1 && (
                      <div className="mx-2 h-px flex-1 overflow-hidden bg-zinc-800">
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: done ? "100%" : "0%" }}
                          transition={{ duration: 0.7, ease: EASE }}
                          className="h-full bg-emerald-500/60"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-2.5 text-[11px] text-zinc-500">{IMPROVE_STEPS[Math.min(activeStep, 2)].sub}</p>
          </motion.div>
        )}

        {state === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="max-h-[200px] overflow-auto scrollbar-none px-3 py-3">
              <p className="mb-1.5 text-[13px] leading-relaxed text-zinc-500 line-through">
                write something about our new pricing for customers
              </p>
              <div className="rounded-[8px] border-l-[3px] border-emerald-500 bg-emerald-500/10 px-3 py-2">
                <p className="text-[13px] leading-relaxed text-zinc-100">
                  Draft a pricing announcement for existing customers that leads with the{" "}
                  <span className="rounded bg-emerald-500/20 px-1 text-emerald-200">new $20/mo plan</span>, explains{" "}
                  <span className="rounded bg-emerald-500/20 px-1 text-emerald-200">what changed and why</span>, and ends
                  with a clear upgrade CTA.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800/80 px-3 py-1.5">
              <span className="font-mono text-[11px] text-zinc-500">
                <span className="text-emerald-400">+24</span> <span className="text-red-400">-8</span> ·{" "}
                <span className="text-zinc-300">clarity +40%</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 pb-3 pt-1">
              <button
                onClick={onAccept}
                className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-white text-[13px] font-medium text-zinc-950 transition-transform active:scale-[0.98] ${RING}`}
              >
                Accept <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800 active:scale-[0.98] ${RING}`}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={onReset}
                aria-label="Regenerate"
                className={`grid h-9 w-9 place-items-center rounded-[8px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98] ${RING}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ============================================================
   2. SKILLS PALETTE
   ============================================================ */

type SkillItem = {
  id: string
  group: string
  icon: React.ReactNode
  label: string
  desc: string
  shortcut?: string
  connected?: boolean
  connectable?: boolean
}

const SKILLS: SkillItem[] = [
  { id: "gmail", group: "CONNECTORS", icon: <Mail className="h-[18px] w-[18px]" />, label: "Gmail", desc: "Connected", connected: true, shortcut: "⌘1" },
  { id: "cal", group: "CONNECTORS", icon: <Calendar className="h-[18px] w-[18px]" />, label: "Calendar", desc: "Connected", connected: true, shortcut: "⌘2" },
  { id: "notion", group: "CONNECTORS", icon: <FileText className="h-[18px] w-[18px]" />, label: "Notion", desc: "Connect", connectable: true },
  { id: "drive", group: "CONNECTORS", icon: <HardDrive className="h-[18px] w-[18px]" />, label: "Drive", desc: "Connect", connectable: true },
  { id: "explain", group: "CODE", icon: <Code2 className="h-[18px] w-[18px]" />, label: "/code Explain selection", desc: "Understand code", shortcut: "⌘3" },
  { id: "refactor", group: "CODE", icon: <Code2 className="h-[18px] w-[18px]" />, label: "/code Refactor", desc: "Clean & improve", shortcut: "⌘4" },
  { id: "research", group: "AGENTS", icon: <Bot className="h-[18px] w-[18px]" />, label: "/agent Research", desc: "Multi-step", shortcut: "⌘5" },
  { id: "fix", group: "AGENTS", icon: <Bot className="h-[18px] w-[18px]" />, label: "/agent Fix", desc: "Autonomous", shortcut: "⌘6" },
]

function SkillsPalette({
  query,
  setQuery,
  selected,
  setSelected,
  onSelect,
  onClose,
}: {
  query: string
  setQuery: (v: string) => void
  selected: number
  setSelected: (v: number) => void
  onSelect: (item: SkillItem) => void
  onClose: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(
    () => SKILLS.filter((s) => (s.label + s.desc).toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  const groups = useMemo(() => {
    const map = new Map<string, SkillItem[]>()
    filtered.forEach((s) => {
      if (!map.has(s.group)) map.set(s.group, [])
      map.get(s.group)!.push(s)
    })
    return Array.from(map.entries())
  }, [filtered])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={SPRING}
      className="glint-shadow flex max-h-[380px] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-[12px] border border-zinc-800/80 bg-zinc-900/85 backdrop-blur-2xl saturate-150 will-change-transform"
    >
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3 py-2.5">
        <span className="font-mono text-[14px] font-medium text-zinc-500">//</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          placeholder="Search skills, connectors, prompts…"
          className="flex-1 bg-transparent text-[14px] text-zinc-100 placeholder:text-zinc-500 outline-none"
        />
        <button onClick={onClose} className={`rounded ${RING}`} aria-label="Close">
          <Kbd>Esc</Kbd>
        </button>
      </div>

      <div className="flex-1 overflow-auto scrollbar-none fade-bottom py-1.5" role="listbox">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <SearchX className="h-8 w-8 text-zinc-600" />
            <p className="text-[13px] text-zinc-300">No skills found</p>
            <p className="text-[12px] text-zinc-500">Try &apos;gmail&apos; or create custom</p>
            <button
              className={`mt-1 rounded-[8px] border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-zinc-700 ${RING}`}
            >
              <Plus className="mr-1 inline h-3 w-3" />
              Create skill
            </button>
          </div>
        ) : (
          groups.map(([group, items]) => (
            <div key={group} className="px-1.5">
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{group}</div>
              {items.map((item) => {
                const flatIndex = filtered.indexOf(item)
                const isSel = flatIndex === selected
                return (
                  <button
                    key={item.id}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setSelected(flatIndex)}
                    onClick={() => onSelect(item)}
                    className={`relative flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2 text-left transition-colors ${
                      isSel ? "bg-zinc-800/90" : "hover:bg-zinc-800/60"
                    } ${RING}`}
                  >
                    {isSel && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white" />}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-zinc-800 text-zinc-300">
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate text-[13px] font-medium text-zinc-100">{item.label}</span>
                    {item.connected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                    <span className={`text-[12px] ${item.connectable ? "text-zinc-400" : "text-zinc-500"}`}>{item.desc}</span>
                    {item.shortcut && <span className="font-mono text-[11px] text-zinc-600">{item.shortcut}</span>}
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex h-8 items-center gap-3 border-t border-zinc-800/80 px-3">
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          <Kbd>↑↓</Kbd> Navigate
        </span>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          <Kbd>⏎</Kbd> Select
        </span>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          <Kbd>Esc</Kbd> Close
        </span>
      </div>
    </motion.div>
  )
}

/* ============================================================
   3. AGENT MODE
   ============================================================ */

const AGENT_STEPS = [
  { title: "Search competitor landing pages", prompt: "Find 5 direct competitors to Glint OS", tool: "web.search" },
  { title: "Extract pricing & positioning", prompt: "Scrape pricing tables and taglines", tool: "web.scrape" },
  { title: "Build comparison table", prompt: "Create a 5-column feature matrix", tool: "table.build" },
  { title: "Draft summary + recommendation", prompt: "Summarize gaps and where Glint wins", tool: "text.write" },
]

const STATE_BADGE: Record<AgentState, { label: string; cls: string }> = {
  idle: { label: "Idle", cls: "bg-zinc-800 text-zinc-400" },
  planning: { label: "Planning", cls: "bg-blue-500/15 text-blue-400" },
  awaiting: { label: "Awaiting approval", cls: "bg-blue-500/15 text-blue-400" },
  running: { label: "Running", cls: "bg-emerald-500/15 text-emerald-400" },
  paused: { label: "Paused", cls: "bg-yellow-500/15 text-yellow-400" },
  done: { label: "Done", cls: "bg-emerald-500/15 text-emerald-400" },
  error: { label: "Error", cls: "bg-red-500/15 text-red-400" },
}

function AgentPanel({
  state,
  currentStep,
  onRun,
  onPause,
  onResume,
  onStop,
  onReset,
}: {
  state: AgentState
  currentStep: number
  onRun: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onReset: () => void
}) {
  const [expanded, setExpanded] = useState<number | null>(1)
  const badge = STATE_BADGE[state]

  return (
    <motion.div
      layout
      transition={SPRING}
      className="glint-shadow w-[540px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[12px] border border-zinc-800/80 bg-zinc-900/85 backdrop-blur-2xl saturate-150"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-medium text-zinc-100">
          <Bot className="h-4 w-4 text-zinc-400" /> Research Agent
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
      </div>

      {state === "error" && (
        <div className="p-3">
          <div className="mb-2.5 flex items-start gap-2 rounded-[10px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-[13px] text-red-100">Run stopped at step {currentStep + 1}. Connection to tool lost.</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onRun}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-white text-[13px] font-medium text-zinc-950 active:scale-[0.98] ${RING}`}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
            <button onClick={onReset} className={`h-9 rounded-[8px] px-3 text-[13px] font-medium text-zinc-300 hover:bg-zinc-800 ${RING}`}>
              Edit Plan
            </button>
          </div>
        </div>
      )}

      {(state === "awaiting" || state === "planning") && (
        <div className="p-3">
          <div className="mb-2.5 flex items-start gap-2 rounded-[10px] border border-blue-500/30 bg-blue-500/10 px-3 py-2.5">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <p className="text-[13px] text-blue-100">Agent will run 4 steps in this chat.</p>
          </div>
          <div className="space-y-1">
            {AGENT_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 hover:bg-zinc-800/50">
                <span className="grid h-4 w-4 place-items-center rounded border border-zinc-600" />
                <span className="text-[13px] text-zinc-200">{s.title}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <button
              onClick={onRun}
              className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-white text-[13px] font-medium text-zinc-950 transition-transform active:scale-[0.98] ${RING}`}
            >
              <Play className="h-3.5 w-3.5" /> Run Plan
            </button>
            <button className={`h-9 rounded-[8px] px-3 text-[13px] font-medium text-zinc-300 hover:bg-zinc-800 ${RING}`}>Edit</button>
            <button onClick={onReset} className={`h-9 rounded-[8px] px-3 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800 ${RING}`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {(state === "running" || state === "paused" || state === "done") && (
        <>
          <div className="relative max-h-[300px] overflow-auto scrollbar-none fade-bottom p-3">
            <div className="absolute left-[22px] top-4 bottom-4 w-px bg-zinc-800" />
            <div className="space-y-1.5">
              {AGENT_STEPS.map((s, i) => {
                const done = i < currentStep || state === "done"
                const active = i === currentStep && state === "running"
                const isOpen = expanded === i
                return (
                  <div key={i} className="relative pl-8">
                    <div className="absolute left-1 top-1.5 grid h-5 w-5 place-items-center">
                      {done ? (
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/20">
                          <Check className="glint-draw h-3 w-3 text-emerald-400" strokeWidth={3} />
                        </span>
                      ) : active ? (
                        <span className="relative h-4 w-4">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="block h-4 w-4 rounded-full"
                            style={{ background: "conic-gradient(from 0deg, transparent, #ffffff)" }}
                          />
                          <span className="absolute inset-[3px] rounded-full bg-zinc-900" />
                        </span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-zinc-700" />
                      )}
                    </div>
                    <button
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className={`flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-zinc-800/50 ${RING}`}
                    >
                      <span className="text-[12px] text-zinc-500">{i + 1}</span>
                      <span className={`flex-1 text-[13px] font-medium ${done || active ? "text-zinc-100" : "text-zinc-500"}`}>
                        {s.title}
                      </span>
                      {done && <span className="font-mono text-[11px] text-zinc-500">{(0.8 + i * 0.4).toFixed(1)}s</span>}
                      <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="ml-2 mt-1 space-y-2 pb-1">
                            <pre className="overflow-x-auto scrollbar-none rounded-[8px] bg-black/60 px-2.5 py-2 font-mono text-[12px] text-zinc-300">
                              {s.prompt}
                            </pre>
                            {done && <p className="text-[13px] text-zinc-400">Found and processed results for this step.</p>}
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                              <Zap className="h-3 w-3" /> {s.tool}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>

          {state === "done" ? (
            <div className="border-t border-zinc-800/80 p-3">
              <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                <CircleCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-[13px] text-emerald-100">Done in 12s · 4 steps · comparison table ready</span>
              </div>
              <button
                onClick={onReset}
                className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] bg-white text-[13px] font-medium text-zinc-950 active:scale-[0.98] ${RING}`}
              >
                <FileText className="h-3.5 w-3.5" /> Save to Notion
              </button>
            </div>
          ) : (
            <div className="relative border-t border-zinc-800/80">
              <div className="absolute left-0 top-0 h-0.5 w-full bg-zinc-800">
                <motion.div
                  className="h-full bg-emerald-500"
                  animate={{ width: `${(currentStep / AGENT_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </div>
              {state === "paused" && (
                <div className="mx-3 mt-3 flex items-center gap-2 rounded-[10px] border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                  <Pause className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-[12px] text-yellow-100">Paused — tab hidden or Esc pressed</span>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="font-mono text-[12px] text-zinc-400">
                  Step {Math.min(currentStep + 1, AGENT_STEPS.length)}/{AGENT_STEPS.length}
                </span>
                <div className="flex gap-1.5">
                  {state === "paused" ? (
                    <button
                      onClick={onResume}
                      className={`flex h-8 items-center gap-1.5 rounded-[8px] bg-zinc-800 px-3 text-[12px] font-medium text-zinc-100 hover:bg-zinc-700 ${RING}`}
                    >
                      <Play className="h-3 w-3" /> Resume
                    </button>
                  ) : (
                    <button
                      onClick={onPause}
                      className={`flex h-8 items-center gap-1.5 rounded-[8px] bg-zinc-800 px-3 text-[12px] font-medium text-zinc-100 hover:bg-zinc-700 ${RING}`}
                    >
                      <Pause className="h-3 w-3" /> Pause
                    </button>
                  )}
                  <button
                    onClick={onStop}
                    className={`flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[12px] font-medium text-red-400 hover:bg-red-500/10 ${RING}`}
                  >
                    <Square className="h-3 w-3" /> Stop
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {state === "idle" && (
        <div className="p-3">
          <p className="mb-2.5 px-1 text-[13px] text-zinc-400">
            Describe a goal and Glint will plan, get approval, then run it step-by-step in this chat.
          </p>
          <button
            onClick={onRun}
            className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] bg-white text-[13px] font-medium text-zinc-950 active:scale-[0.98] ${RING}`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Plan a task
          </button>
        </div>
      )}
    </motion.div>
  )
}

/* ============================================================
   4. CODE MODE
   ============================================================ */

type FileNode = { name: string; type: "file" | "folder"; icon?: React.ReactNode; children?: FileNode[] }

const FILE_TREE: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      { name: "auth.ts", type: "file", icon: <FileCode className="h-3.5 w-3.5 text-blue-400" /> },
      { name: "index.ts", type: "file", icon: <FileCode className="h-3.5 w-3.5 text-blue-400" /> },
    ],
  },
  {
    name: "components",
    type: "folder",
    children: [{ name: "Button.tsx", type: "file", icon: <FileCode className="h-3.5 w-3.5 text-cyan-400" /> }],
  },
  { name: "package.json", type: "file", icon: <FileJson className="h-3.5 w-3.5 text-yellow-400" /> },
]

const DIFF_LINES = [
  { n: 12, type: "ctx", text: "export async function signIn(email: string, password: string) {" },
  { n: 13, type: "del", text: "  const user = db.users.find(u => u.email === email)" },
  { n: 13, type: "add", text: "  const user = await db.users.findUnique({ where: { email } })" },
  { n: 14, type: "del", text: "  if (user.password === password) return user" },
  { n: 14, type: "add", text: "  if (!user) throw new AuthError('User not found')" },
  { n: 15, type: "add", text: "  const ok = await bcrypt.compare(password, user.hash)" },
  { n: 16, type: "add", text: "  if (!ok) throw new AuthError('Invalid credentials')" },
  { n: 17, type: "add", text: "  return createSession(user.id)" },
  { n: 18, type: "ctx", text: "}" },
]

const TERMINAL_LINES = [
  { type: "cmd", text: "$ npm test" },
  { type: "out", text: "> glint@1.0.0 test" },
  { type: "out", text: "> vitest run src/auth.test.ts" },
  { type: "out", text: "" },
  { type: "ok", text: "✓ src/auth.test.ts (3)" },
  { type: "out", text: "  ✓ signs in valid user" },
  { type: "out", text: "  ✓ rejects bad password" },
  { type: "out", text: "  ✓ hashes stored password" },
  { type: "ok", text: "✓ 3 tests passed · 42ms" },
]

function CodeMode({
  connected,
  onBrowse,
  onApply,
  permissionLost,
  onReconnect,
}: {
  connected: boolean
  onBrowse: () => void
  onApply: () => void
  permissionLost: boolean
  onReconnect: () => void
}) {
  const [activeFile, setActiveFile] = useState("auth.ts")

  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="glint-shadow w-[640px] max-w-[calc(100vw-32px)] rounded-[12px] border border-zinc-800/80 bg-zinc-900/85 p-3 backdrop-blur-2xl"
      >
        <button
          onClick={onBrowse}
          className={`flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-zinc-700 transition-colors hover:border-zinc-600 hover:bg-zinc-800/30 ${RING}`}
        >
          <FolderOpen className="h-10 w-10 text-zinc-600" />
          <span className="text-[14px] font-medium text-zinc-200">Drop folder or click to browse</span>
          <span className="text-[12px] text-zinc-500">Local only, never uploaded · Uses File System API</span>
          <span className="mt-2 rounded-[8px] border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[12px] font-medium text-zinc-200">
            Browse Files
          </span>
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="glint-shadow w-[680px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[12px] border border-zinc-800/80 bg-zinc-900/85 backdrop-blur-2xl saturate-150"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 font-mono text-[12px] text-zinc-300">
            <Folder className="h-3 w-3" /> /my-app
          </span>
          {permissionLost ? (
            <span className="flex items-center gap-1.5 text-[12px] text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" /> Permission lost
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
            </span>
          )}
        </div>
        {permissionLost ? (
          <button
            onClick={onReconnect}
            className={`rounded-[8px] bg-yellow-500/15 px-2.5 py-1 text-[12px] font-medium text-yellow-400 hover:bg-yellow-500/25 ${RING}`}
          >
            Reconnect
          </button>
        ) : (
          <button className={`rounded-[8px] px-2.5 py-1 text-[12px] font-medium text-zinc-400 hover:bg-zinc-800 ${RING}`}>Change</button>
        )}
      </div>

      {permissionLost && (
        <div className="mx-3 mt-3 flex items-center justify-between rounded-[10px] border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
          <span className="text-[13px] text-yellow-100">Folder access expired</span>
          <button
            onClick={onReconnect}
            className={`rounded-[8px] bg-yellow-500/20 px-3 py-1 text-[12px] font-medium text-yellow-300 hover:bg-yellow-500/30 ${RING}`}
          >
            Reconnect
          </button>
        </div>
      )}

      <div className="flex">
        <div className="w-[200px] shrink-0 border-r border-zinc-800/80 p-2">
          {FILE_TREE.map((node) => (
            <div key={node.name}>
              {node.type === "folder" ? (
                <>
                  <div className="flex items-center gap-1 rounded-[6px] px-1.5 py-1 text-[13px] text-zinc-300">
                    <ChevronDown className="h-3 w-3 text-zinc-500" />
                    <Folder className="h-3.5 w-3.5 text-zinc-500" />
                    {node.name}
                  </div>
                  <div className="ml-3">
                    {node.children?.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setActiveFile(c.name)}
                        className={`flex w-full items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-left text-[13px] transition-colors ${
                          activeFile === c.name ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/50"
                        } ${RING}`}
                      >
                        {c.icon}
                        {c.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setActiveFile(node.name)}
                  className={`flex w-full items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-left text-[13px] transition-colors ${
                    activeFile === node.name ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/50"
                  } ${RING}`}
                >
                  {node.icon}
                  {node.name}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-1.5">
            <span className="font-mono text-[12px] text-zinc-500">
              <span className="text-emerald-400">+42</span> <span className="text-red-400">-12</span> · 3 files
            </span>
            <span className="font-mono text-[12px] text-zinc-500">src/{activeFile}</span>
          </div>
          <div className="max-h-[220px] overflow-auto scrollbar-none" style={{ contentVisibility: "auto" }}>
            {DIFF_LINES.map((l, i) => (
              <div
                key={i}
                className={`flex font-mono text-[12px] leading-relaxed ${
                  l.type === "add" ? "bg-emerald-500/10" : l.type === "del" ? "bg-red-500/10" : ""
                }`}
              >
                <span className="w-10 shrink-0 select-none bg-zinc-900/50 px-2 text-right text-zinc-600">{l.n}</span>
                <span
                  className={`w-4 shrink-0 select-none text-center ${
                    l.type === "add" ? "text-emerald-400" : l.type === "del" ? "text-red-400" : "text-zinc-700"
                  }`}
                >
                  {l.type === "add" ? "+" : l.type === "del" ? "-" : ""}
                </span>
                <span
                  className={`whitespace-pre pr-3 ${
                    l.type === "add" ? "text-emerald-200" : l.type === "del" ? "text-red-300" : "text-zinc-400"
                  }`}
                >
                  {l.text}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800/80">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
                <Terminal className="h-3 w-3" /> zsh — npm test
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">PASS</span>
            </div>
            <div className="h-[140px] overflow-auto scrollbar-none bg-[#0a0a0a] px-3 py-2">
              {TERMINAL_LINES.map((l, i) => (
                <div
                  key={i}
                  className={`font-mono text-[12px] leading-relaxed ${
                    l.type === "cmd" ? "text-zinc-100" : l.type === "ok" ? "text-emerald-400" : "text-zinc-400"
                  }`}
                >
                  {l.text || "\u00A0"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-t border-zinc-800/80 p-3">
        <button
          onClick={onApply}
          className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-white text-[13px] font-medium text-zinc-950 active:scale-[0.97] ${RING}`}
        >
          <Check className="h-3.5 w-3.5" /> Approve &amp; Apply
        </button>
        <button className={`h-9 rounded-[8px] bg-zinc-800 px-3 text-[13px] font-medium text-zinc-200 hover:bg-zinc-700 ${RING}`}>
          Run Tests
        </button>
        <button className={`h-9 rounded-[8px] px-3 text-[13px] font-medium text-zinc-400 hover:bg-zinc-800 ${RING}`}>Discard</button>
      </div>
    </motion.div>
  )
}

/* ============================================================
   Confetti
   ============================================================ */

function Confetti({ show }: { show: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320,
        y: -(Math.random() * 220 + 80),
        rot: Math.random() * 360,
        color: ["#10b981", "#3b82f6", "#ffffff", "#eab308"][i % 4],
        delay: Math.random() * 0.1,
      })),
    [],
  )
  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[80]">
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rot, scale: 0.5 }}
              transition={{ duration: 0.9, ease: EASE, delay: p.delay }}
              className="absolute h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

/* ============================================================
   5. LIBRARY SIDEPANEL
   ============================================================ */

const PROMPTS = [
  {
    title: "Competitor research table",
    content: "Research 5 competitors for Glint and make a table comparing pricing, positioning, and gaps.",
    folder: "Research",
    uses: 12,
    vars: ["{{count}}", "{{product}}"],
  },
  {
    title: "Pricing email summary",
    content: "Summarize last 5 emails about pricing and draft a reply to the most recent thread.",
    folder: "Inbox",
    uses: 34,
    vars: ["{{audience}}"],
  },
  {
    title: "Refactor with tests",
    content: "Refactor the selected function and generate matching unit tests with edge cases.",
    folder: "Code",
    uses: 8,
    vars: ["{{file}}"],
  },
]

const INITIAL_CONNECTORS = [
  { name: "Gmail", desc: "Read & draft email", on: true },
  { name: "Calendar", desc: "Schedule & availability", on: true },
  { name: "Notion", desc: "Docs & databases", on: false },
  { name: "GitHub", desc: "Repos & pull requests", on: false },
]

const HISTORY: Record<string, { title: string; time: string }[]> = {
  Today: [
    { title: "Improved pricing announcement", time: "2m ago" },
    { title: "Ran Research Agent · 4 steps", time: "18m ago" },
  ],
  Yesterday: [
    { title: "Refactored src/auth.ts", time: "16:02" },
    { title: "Summarized pricing emails", time: "09:41" },
  ],
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${on ? "bg-white" : "bg-zinc-700"} ${RING}`}
    >
      <motion.span
        layout
        transition={SPRING}
        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full ${on ? "right-0.5 bg-zinc-950" : "left-0.5 bg-zinc-300"}`}
      />
    </button>
  )
}

function LibraryPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<"prompts" | "connectors" | "history">("prompts")
  const [connectors, setConnectors] = useState(INITIAL_CONNECTORS)
  const [dragging, setDragging] = useState<number | null>(null)

  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-3 border-l border-zinc-800/80 py-3">
        <button
          onClick={onToggle}
          aria-label="Expand library"
          className={`grid h-8 w-8 place-items-center rounded-[8px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 ${RING}`}
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        <div className="h-px w-6 bg-zinc-800" />
        {[FileText, Zap, RotateCcw].map((Icon, i) => (
          <button key={i} className={`grid h-8 w-8 place-items-center rounded-[8px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 ${RING}`}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex w-[360px] shrink-0 flex-col border-l border-zinc-800/80 bg-zinc-900/40">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-[8px] border border-zinc-800 bg-zinc-900 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-zinc-500" />
          <input
            placeholder="Search library…"
            className="flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <Kbd>⌘K</Kbd>
        </div>
        <button
          onClick={onToggle}
          aria-label="Collapse library"
          className={`grid h-8 w-8 place-items-center rounded-[8px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 ${RING}`}
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-zinc-800/80 px-3 py-2">
        {(
          [
            ["prompts", "Prompts", 24],
            ["connectors", "Connectors", null],
            ["history", "History", null],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[13px] font-medium transition-colors ${
              tab === id ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            } ${RING}`}
          >
            {label}
            {count && <span className="rounded bg-zinc-800 px-1 text-[11px] text-zinc-400">{count}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto scrollbar-none fade-bottom p-3">
        {tab === "prompts" && (
          <div className="space-y-2">
            {PROMPTS.map((p, i) => (
              <motion.div
                key={i}
                layout
                animate={dragging === i ? { rotate: 2, scale: 1.02 } : { rotate: 0, scale: 1 }}
                onMouseDown={() => setDragging(i)}
                onMouseUp={() => setDragging(null)}
                onMouseLeave={() => setDragging(null)}
                className={`group cursor-grab rounded-[10px] border border-zinc-800/80 bg-zinc-900/60 p-3 transition-colors hover:border-zinc-700 active:cursor-grabbing ${
                  dragging === i ? "glint-shadow opacity-90" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-medium text-zinc-100">{p.title}</h4>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-zinc-500">{p.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{p.folder}</span>
                      <span className="text-[11px] text-zinc-500">· {p.uses} uses</span>
                      {p.vars.map((v) => (
                        <span key={v} className="rounded bg-blue-500/15 px-1.5 py-0.5 font-mono text-[10px] text-blue-400">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-emerald-300" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Insight</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-200">
                Your &apos;Add example&apos; prompts get <span className="font-medium text-emerald-300">2.3x better results</span>.
              </p>
            </div>
          </div>
        )}

        {tab === "connectors" && (
          <div className="space-y-1">
            {connectors.map((c, i) => (
              <div key={c.name} className="flex h-11 items-center gap-2.5 rounded-[8px] px-2 hover:bg-zinc-800/40">
                <span className="grid h-5 w-5 place-items-center text-zinc-400">
                  {c.name === "Gmail" ? (
                    <Mail className="h-5 w-5" />
                  ) : c.name === "Calendar" ? (
                    <Calendar className="h-5 w-5" />
                  ) : c.name === "Notion" ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <Code2 className="h-5 w-5" />
                  )}
                </span>
                <div className="flex-1">
                  <div className="text-[13px] text-zinc-100">{c.name}</div>
                  <div className="text-[11px] text-zinc-500">{c.desc}</div>
                </div>
                <Toggle on={c.on} onClick={() => setConnectors((prev) => prev.map((x, xi) => (xi === i ? { ...x, on: !x.on } : x)))} />
              </div>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            {Object.entries(HISTORY).map(([day, items]) => (
              <div key={day}>
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{day}</div>
                <div className="relative space-y-1 pl-4">
                  <div className="absolute left-1 top-1.5 bottom-1.5 w-px bg-zinc-800" />
                  {items.map((h, i) => (
                    <div key={i} className="relative rounded-[8px] px-2 py-1.5 hover:bg-zinc-800/40">
                      <span className="absolute -left-3 top-2.5 h-1.5 w-1.5 rounded-full bg-zinc-600" />
                      <div className="text-[13px] text-zinc-200">{h.title}</div>
                      <div className="text-[11px] text-zinc-500">{h.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   ROOT APP
   ============================================================ */

export default function GlintOS() {
  const [mode, setMode] = useState<Mode>("improve")
  const [promptState, setPromptState] = useState<PromptState>("idle")
  const [improveStep, setImproveStep] = useState(0)
  const [agentState, setAgentState] = useState<AgentState>("awaiting")
  const [agentStep, setAgentStep] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState("")
  const [paletteSel, setPaletteSel] = useState(0)
  const [folderConnected, setFolderConnected] = useState(false)
  const [permissionLost, setPermissionLost] = useState(false)
  const [libCollapsed, setLibCollapsed] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [inputValue, setInputValue] = useState("")
  const [composerFocused, setComposerFocused] = useState(false)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const pushToast = useCallback((message: string, action?: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])
  const dismissToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  /* ---- Improve flow ---- */
  const runImprove = useCallback(() => {
    clearTimers()
    setPromptState("streaming")
    setImproveStep(0)
    timers.current.push(setTimeout(() => setImproveStep(1), 800))
    timers.current.push(setTimeout(() => setImproveStep(2), 1600))
    timers.current.push(setTimeout(() => setImproveStep(3), 2400))
    timers.current.push(setTimeout(() => setPromptState("done"), 2600))
  }, [clearTimers])

  const acceptImprove = useCallback(() => {
    setPromptState("idle")
    pushToast("Applied · Undo Cmd+Z", "Undo")
  }, [pushToast])

  /* ---- Agent flow ---- */
  const runAgent = useCallback(() => {
    clearTimers()
    setAgentState("running")
    setAgentStep(0)
    for (let i = 1; i <= AGENT_STEPS.length; i++) {
      timers.current.push(
        setTimeout(() => {
          setAgentStep(i)
          if (i === AGENT_STEPS.length) setAgentState("done")
        }, i * 900),
      )
    }
  }, [clearTimers])

  const resetAgent = useCallback(() => {
    clearTimers()
    setAgentState("awaiting")
    setAgentStep(0)
  }, [clearTimers])

  /* ---- Code flow ---- */
  const applyCode = useCallback(() => {
    setConfetti(true)
    pushToast("Applied to /my-app · 3 files changed", "Undo")
    setTimeout(() => setConfetti(false), 1000)
  }, [pushToast])

  /* ---- Palette ---- */
  const filteredPalette = useMemo(
    () => SKILLS.filter((s) => (s.label + s.desc).toLowerCase().includes(paletteQuery.toLowerCase())),
    [paletteQuery],
  )
  const openPalette = useCallback(() => {
    setPaletteOpen(true)
    setPaletteQuery("")
    setPaletteSel(0)
    setMode("skills")
  }, [])
  const selectSkill = useCallback(
    (item: SkillItem) => {
      setPaletteOpen(false)
      pushToast(`${item.label} activated`, "Dismiss")
    },
    [pushToast],
  )

  /* ---- Global keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      const tag = (e.target as HTMLElement)?.tagName
      const inField = tag === "INPUT" || tag === "TEXTAREA"

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault()
        openPalette()
        return
      }
      if (meta && e.key === "/") {
        e.preventDefault()
        openPalette()
        return
      }
      if (e.key === "Escape") {
        if (paletteOpen) {
          setPaletteOpen(false)
          return
        }
        if (promptState === "done" || promptState === "streaming") {
          clearTimers()
          setPromptState("idle")
          return
        }
        if (agentState === "running") {
          setAgentState("paused")
          clearTimers()
          return
        }
      }
      if (paletteOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setPaletteSel((s) => Math.min(s + 1, filteredPalette.length - 1))
        } else if (e.key === "ArrowUp") {
          e.preventDefault()
          setPaletteSel((s) => Math.max(s - 1, 0))
        } else if (e.key === "Enter") {
          e.preventDefault()
          if (filteredPalette[paletteSel]) selectSkill(filteredPalette[paletteSel])
        }
        return
      }
      if (!inField && !meta && ["1", "2", "3", "4", "5"].includes(e.key)) {
        const m = MODES[Number(e.key) - 1]
        if (m) {
          setMode(m.id)
          if (m.id === "skills") openPalette()
        }
      }
      if (mode === "improve" && promptState === "done" && (e.key === "Enter" || e.key === "ArrowRight") && !inField) {
        acceptImprove()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [paletteOpen, promptState, agentState, mode, filteredPalette, paletteSel, openPalette, clearTimers, selectSkill, acceptImprove])

  const onInputChange = (v: string) => {
    if (v.endsWith("//") && !paletteOpen) {
      openPalette()
      setInputValue("")
      return
    }
    setInputValue(v)
  }

  const overlay = (
    <AnimatePresence mode="wait">
      {mode === "skills" && paletteOpen && (
        <motion.div key="palette">
          <SkillsPalette
            query={paletteQuery}
            setQuery={setPaletteQuery}
            selected={paletteSel}
            setSelected={setPaletteSel}
            onSelect={selectSkill}
            onClose={() => setPaletteOpen(false)}
          />
        </motion.div>
      )}
      {mode === "improve" && (
        <motion.div key="improve">
          <ImproveIsland
            state={promptState}
            activeStep={improveStep}
            onStream={runImprove}
            onAccept={acceptImprove}
            onReset={() => setPromptState("idle")}
            onCopy={() => pushToast("Copied to clipboard")}
          />
        </motion.div>
      )}
      {mode === "agent" && (
        <motion.div key="agent">
          <AgentPanel
            state={agentState}
            currentStep={agentStep}
            onRun={runAgent}
            onPause={() => {
              setAgentState("paused")
              clearTimers()
            }}
            onResume={() => {
              setAgentState("running")
              for (let i = agentStep + 1; i <= AGENT_STEPS.length; i++) {
                timers.current.push(
                  setTimeout(() => {
                    setAgentStep(i)
                    if (i === AGENT_STEPS.length) setAgentState("done")
                  }, (i - agentStep) * 900),
                )
              }
            }}
            onStop={() => {
              clearTimers()
              setAgentState("error")
            }}
            onReset={resetAgent}
          />
        </motion.div>
      )}
      {mode === "code" && (
        <motion.div key="code" className="relative">
          <Confetti show={confetti} />
          <CodeMode
            connected={folderConnected}
            onBrowse={() => setFolderConnected(true)}
            onApply={applyCode}
            permissionLost={permissionLost}
            onReconnect={() => setPermissionLost(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )

  const meta = MODE_META[mode]
  const ModeIcon = meta.icon
  const hasText = inputValue.trim().length > 0
  const sendMessage = () => {
    if (hasText) {
      pushToast("Message sent")
      setInputValue("")
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="grid h-6 w-6 place-items-center rounded-[8px] bg-white text-zinc-950">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="hidden text-[13px] font-medium text-zinc-100 sm:block">Glint OS</span>
          </div>

          <nav className="flex items-center gap-0.5 rounded-full border border-zinc-800/80 bg-zinc-900/60 p-0.5">
            {MODES.map((m) => {
              const active = mode === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id)
                    if (m.id !== "skills") setPaletteOpen(false)
                    if (m.id === "skills") openPalette()
                  }}
                  className={`relative flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                    active ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                  } ${RING}`}
                >
                  {active && <motion.span layoutId="mode-pill" transition={SPRING} className="absolute inset-0 rounded-full bg-white" />}
                  <span className="relative z-10">{m.label}</span>
                  <span className={`relative z-10 font-mono text-[10px] ${active ? "text-zinc-500" : "text-zinc-600"}`}>{m.hint}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openPalette}
            className={`flex items-center gap-1.5 rounded-[8px] border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[12px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 ${RING}`}
          >
            <Command className="h-3 w-3" /> K
          </button>
          <span className="hidden items-center gap-1.5 text-[12px] text-zinc-400 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-w-0 flex-1 justify-center">
          <div className="flex w-full max-w-[600px] flex-col px-4">
            <div className="flex-1 overflow-auto scrollbar-none fade-bottom py-6">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-[12px] rounded-tr-[4px] bg-zinc-800 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-100">
                    Help me write a pricing announcement for Glint OS.
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-[12px] rounded-tl-[4px] border border-zinc-800/80 bg-zinc-900/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-300">
                    Sure. Glint OS sits on top of your chat and adds a universal skills layer — Improve, Skills, Agents,
                    and Code. Try the toolbar below your message, or press <span className="font-mono text-zinc-100">//</span> to
                    open the skills palette.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-[12px] rounded-tr-[4px] bg-zinc-800 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-100">
                    Re: Glint pricing — $20/mo? Let&apos;s make it outcome-first.
                  </div>
                </div>
              </div>
            </div>

            <div className="relative pb-6">
              {/* Overlay anchored above input */}
              <div className="absolute bottom-full left-0 mb-3 flex w-full justify-center">
                <div className="flex justify-center">{overlay}</div>
              </div>

              {/* Composer HUD */}
              <div className="relative">
                {/* ambient focus glow */}
                <motion.div
                  aria-hidden
                  animate={{ opacity: composerFocused ? 1 : 0, scale: composerFocused ? 1 : 0.97 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="pointer-events-none absolute -inset-4 rounded-[22px] bg-white/[0.05] blur-2xl"
                />

                <div
                  className={`glint-shadow relative overflow-hidden rounded-[14px] border bg-zinc-900/85 backdrop-blur-2xl transition-colors duration-200 ${
                    composerFocused ? "border-zinc-600" : "border-zinc-800"
                  }`}
                >
                  {/* top status strip */}
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        <Sparkles className="h-3 w-3 text-zinc-400" />
                        <span className="hidden sm:inline">Glint.OS</span>
                      </span>
                      <span className="text-zinc-700">//</span>
                      <span className={`flex items-center gap-1 ${meta.tint}`}>
                        <ModeIcon className="h-3 w-3" />
                        {meta.tag}
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-zinc-500">
                      <motion.span
                        animate={{ opacity: composerFocused ? [1, 0.35, 1] : 1 }}
                        transition={{ repeat: composerFocused ? Number.POSITIVE_INFINITY : 0, duration: 1.8, ease: "easeInOut" }}
                        className={`h-1.5 w-1.5 rounded-full ${composerFocused ? meta.dot : "bg-zinc-600"}`}
                      />
                      {composerFocused ? "Awaiting input" : "Ready"}
                    </span>
                  </div>

                  {/* input row */}
                  <div className="flex items-end gap-2 p-2">
                    <button
                      onClick={openPalette}
                      aria-label="Add skill or attachment"
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 ${RING}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <textarea
                      rows={1}
                      value={inputValue}
                      onChange={(e) => onInputChange(e.target.value)}
                      onFocus={() => setComposerFocused(true)}
                      onBlur={() => setComposerFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      placeholder="Message Glint…  (type // for skills)"
                      className="max-h-24 min-h-[32px] flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-500 outline-none scrollbar-none"
                    />
                    <motion.button
                      aria-label="Send"
                      onClick={sendMessage}
                      disabled={!hasText}
                      whileTap={hasText ? { scale: 0.92 } : undefined}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] transition-colors ${RING} ${
                        hasText ? "bg-white text-zinc-950" : "bg-zinc-800 text-zinc-600"
                      }`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </motion.button>
                  </div>

                  {/* bottom quick-action strip */}
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-800/70 px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={openPalette}
                        className={`flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 ${RING}`}
                      >
                        <Zap className="h-3 w-3" /> Skills <span className="font-mono text-zinc-600">//</span>
                      </button>
                      <button
                        onClick={() => pushToast("Attach a file")}
                        className={`hidden items-center gap-1.5 rounded-[8px] px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 sm:flex ${RING}`}
                      >
                        <FileText className="h-3 w-3" /> Attach
                      </button>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-600">
                      <span className={hasText ? "text-zinc-400" : ""}>
                        {inputValue.length.toString().padStart(3, "0")}
                      </span>
                      <span className="text-zinc-700">/</span>
                      <span>4000</span>
                      <span className="hidden text-zinc-700 sm:inline">·</span>
                      <span className="hidden items-center gap-1 sm:flex">
                        <CornerDownLeft className="h-3 w-3" /> send
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-2 text-center text-[11px] text-zinc-600">
                Press <span className="font-mono text-zinc-500">1–5</span> to switch modes ·{" "}
                <span className="font-mono text-zinc-500">//</span> for skills
              </p>
            </div>
          </div>
        </main>

        <div className="hidden lg:flex">
          <LibraryPanel collapsed={libCollapsed} onToggle={() => setLibCollapsed((c) => !c)} />
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
