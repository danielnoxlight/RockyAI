'use client'

import { useState, useRef, useEffect, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { BottomNav } from '@/components/bottom-nav'
import {
  createThread,
  deleteThread,
  renameThread,
  getThreadMessages,
  clearThreadMessages,
  type ThreadSummary,
  type ChatHistoryItem,
} from '@/app/actions/chat'
import {
  Sparkles,
  Send,
  Dumbbell,
  Plus,
  Minus,
  Pencil,
  ListChecks,
  Bot,
  Trash2,
  MessageSquarePlus,
  ChevronLeft,
  ArrowLeftRight,
  Target,
  RefreshCw,
  LayoutGrid,
  X,
  MessagesSquare,
  ChevronDown,
  ClipboardList,
  Check,
} from 'lucide-react'



// ─── Tool chips ──────────────────────────────────────────────────────────────

type ToolPartLike = {
  type: string
  state?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
}

type ToolMetaEntry = { icon: typeof Plus; color: string }
const TOOL_STYLE: Record<string, ToolMetaEntry> = {
  'tool-addExercise':    { icon: Plus,          color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  'tool-removeExercise': { icon: Minus,         color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  'tool-updateExercise': { icon: Pencil,        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  'tool-listWorkouts':   { icon: ListChecks,    color: 'text-muted-foreground bg-secondary border-border' },
  'tool-swapDays':       { icon: ArrowLeftRight, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  'tool-setDayFocus':    { icon: Target,        color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  'tool-setPlanGoal':    { icon: Target,        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  'tool-replaceAllDays': { icon: LayoutGrid,    color: 'text-primary bg-primary/10 border-primary/20' },
  'tool-regeneratePlan': { icon: RefreshCw,     color: 'text-primary bg-primary/10 border-primary/20' },
}

function ToolChip({ part }: { part: ToolPartLike }) {
  const { t } = useTranslation()
  const tc = t.coach.tools
  const meta = TOOL_STYLE[part.type]
  if (!meta) return null
  const Icon = meta.icon
  const done = part.state === 'output-available'
  const failed = done && part.output?.success === false
  const name = (part.input?.name as string) || ''

  let text: string = String(tc[part.type as keyof typeof tc] ?? part.type)
  if (part.type === 'tool-addExercise' && name && done) text = `${tc.addedPrefix}: ${name}`
  else if (part.type === 'tool-removeExercise' && name && done) text = `${tc.removedPrefix}: ${name}`
  else if (part.type === 'tool-updateExercise' && name && done) text = `${tc.updatedPrefix}: ${name}`
  else if (part.type === 'tool-swapDays' && done) text = tc.swapDaysDone(part.input?.dayIndexA, part.input?.dayIndexB)
  else if (part.type === 'tool-setPlanGoal' && done) text = `${tc.goalChanged}: ${part.input?.goal ?? ''}`
  else if (part.type === 'tool-replaceAllDays') text = done ? tc.replaceAllDone((part.output?.totalDays as number) ?? 0) : tc['tool-replaceAllDays']
  else if (part.type === 'tool-regeneratePlan') text = done && part.output?.success ? tc.regenDone : tc['tool-regeneratePlan']
  if (failed) text = (part.output?.error as string) || tc.failed

  const spinning = (part.type === 'tool-regeneratePlan' || part.type === 'tool-replaceAllDays') && !done

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        failed ? 'text-red-400 bg-red-500/10 border-red-500/20' : meta.color
      }`}
    >
      <Icon className={`w-3 h-3 flex-shrink-0 ${spinning ? 'animate-spin' : ''}`} />
      <span className="truncate max-w-[240px]">{text}</span>
    </div>
  )
}

// ─── Bubble ──────────────────────────────────────────────────────────────────

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[85%] ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border border-border text-foreground rounded-bl-md'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise plan/chat titles so week abbreviations and default chat names match the UI language. */
function localizeTitle(title: string, lang: string): string {
  if (lang === 'ru') {
    let out = title.replace(/(\d+)\s*wks?/gi, '$1 нед')
    out = out.replace(/^New chat$/i, 'Новый чат')
    return out
  }
  let out = title.replace(/(\d+)\s*нед/g, '$1 wk')
  out = out.replace(/^Новый чат$/i, 'New chat')
  out = out.replace(/^Первый чат$/i, 'New chat')
  return out
}

// ─── Thread Sidebar ───────────────────────────────────────────────────────────

function ThreadSidebar({
  threads,
  activeId,
  lang,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onClose,
}: {
  threads: ThreadSummary[]
  activeId: string
  lang: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const co = t.coach
  const [, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (t: ThreadSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(t.id)
    setEditValue(t.title)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = (id: string) => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== threads.find(t => t.id === id)?.title) {
      onRename(id, trimmed)
    }
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label={co.closeChat}
      />
      {/* Drawer */}
      <div className="relative w-72 max-w-[80vw] bg-background border-r border-border flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold text-foreground text-sm">{co.chatsTitle}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-3 py-3 border-b border-border">
          <button
            onClick={() => { startTransition(() => { onNew() }) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
            {co.newChat}
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto py-2">
          {threads.length === 0 && (
            <p className="text-xs text-muted-foreground text-center px-4 py-6">
              {co.noChats}
            </p>
          )}
          {threads.map(t => (
            <div
              key={t.id}
              className={`group flex items-center gap-2 mx-2 rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                t.id === activeId
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-secondary text-foreground'
              }`}
              onClick={() => {
                if (editingId !== t.id) { onSelect(t.id); onClose() }
              }}
            >
              <Bot className="w-4 h-4 flex-shrink-0 text-muted-foreground" />

              {/* Inline rename input or title */}
              {editingId === t.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(t.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitEdit(t.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 min-w-0 text-sm bg-background border border-primary/50 rounded-md px-2 py-0.5 text-foreground outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm truncate">{localizeTitle(t.title, lang)}</span>
              )}

              {/* Action buttons — pencil + trash */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                {editingId !== t.id && (
                  <button
                    onClick={e => startEdit(t, e)}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary transition-colors"
                    aria-label={co.renameChat}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(t.id) }}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={co.deleteChat}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type PlanSummary = { id: string; title: string; goal: string }

export type CoachChatProps = {
  hasPlan: boolean
  initialActivePlanId: string | null
  allPlans: PlanSummary[]
  initialThreads: ThreadSummary[]
  initialThreadId: string
  initialHistory: ChatHistoryItem[]
}

export function CoachChat({ hasPlan, initialActivePlanId, allPlans, initialThreads, initialThreadId, initialHistory }: CoachChatProps) {
  const { t, lang } = useTranslation()
  const co = t.coach
  const router = useRouter()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const editedRef = useRef(false)
  const [, startTransition] = useTransition()

  // Thread state
  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState<string>(initialThreadId)
  const [history, setHistory] = useState<ChatHistoryItem[]>(initialHistory)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)

  // Plan selector state
  const [activePlanId, setActivePlanId] = useState<string | null>(initialActivePlanId)
  const [planPickerOpen, setPlanPickerOpen] = useState(false)
  const activePlan = allPlans.find(p => p.id === activePlanId) ?? null

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/coach',
      body: { threadId: activeThreadId, activePlanId: activePlanId ?? undefined, lang },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      if (editedRef.current) {
        editedRef.current = false
        router.refresh()
      }
    },
  })

  const busy = status === 'submitted' || status === 'streaming'

  // Track editing tool usage
  useEffect(() => {
    for (const m of messages) {
      for (const p of m.parts as ToolPartLike[]) {
        if (
          ['tool-addExercise', 'tool-removeExercise', 'tool-updateExercise',
           'tool-swapDays', 'tool-setDayFocus', 'tool-setPlanGoal',
           'tool-replaceAllDays', 'tool-regeneratePlan'].includes(p.type) &&
          p.state === 'output-available' &&
          p.output?.success !== false
        ) {
          editedRef.current = true
        }
      }
    }
  }, [messages])

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy, history])

  const submit = (text: string) => {
    const value = text.trim()
    if (!value || busy) return
    sendMessage({ text: value })
    setInput('')
  }

  // Switch thread
  const switchThread = useCallback(async (threadId: string) => {
    if (threadId === activeThreadId) return
    setLoadingThread(true)
    setMessages([])
    setActiveThreadId(threadId)
    try {
      const msgs = await getThreadMessages(threadId)
      setHistory(msgs)
    } catch {
      setHistory([])
    } finally {
      setLoadingThread(false)
    }
  }, [activeThreadId, setMessages])

  // Create new thread
  const handleNewThread = async () => {
    const id = await createThread(co.newChat)
    const newThread: ThreadSummary = { id, title: co.newChat, createdAt: new Date() }
    setThreads(prev => [newThread, ...prev])
    setSidebarOpen(false)
    setMessages([])
    setHistory([])
    setActiveThreadId(id)
  }

  // Rename thread
  const handleRenameThread = (threadId: string, title: string) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, title } : t))
    startTransition(async () => {
      await renameThread(threadId, title)
    })
  }

  // Delete thread
  const handleDeleteThread = (threadId: string) => {
    startTransition(async () => {
      await deleteThread(threadId)
      setThreads(prev => prev.filter(t => t.id !== threadId))
      if (threadId === activeThreadId) {
        // Switch to first remaining or create new
        const remaining = threads.filter(t => t.id !== threadId)
        if (remaining.length > 0) {
          await switchThread(remaining[0].id)
        } else {
          await handleNewThread()
        }
      }
    })
  }

  // Clear current thread messages
  const handleClear = () => {
    startTransition(async () => {
      await clearThreadMessages(activeThreadId)
      setHistory([])
      setMessages([])
    })
  }

  const isEmpty = history.length === 0 && messages.length === 0
  const hasContent = history.length > 0 || messages.length > 0

  const activeThread = threads.find(t => t.id === activeThreadId)

  return (
    <main className="min-h-svh bg-background flex flex-col">
      {/* Sidebar */}
      {sidebarOpen && (
        <ThreadSidebar
          threads={threads}
          activeId={activeThreadId}
          lang={lang}
          onSelect={switchThread}
          onNew={handleNewThread}
          onDelete={handleDeleteThread}
          onRename={handleRenameThread}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Plan picker dropdown */}
      {planPickerOpen && allPlans.length > 0 && (
        <div className="fixed inset-0 z-50" onClick={() => setPlanPickerOpen(false)}>
          <div
            className="absolute left-4 right-4 top-[106px] max-w-lg mx-auto bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{co.pickPlan}</span>
              <button
                onClick={() => setPlanPickerOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-1 max-h-64 overflow-y-auto">
              {/* No plan option */}
              <button
                onClick={() => { setActivePlanId(null); setPlanPickerOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors ${!activePlanId ? 'bg-primary/5' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{co.noPlan}</p>
                  <p className="text-xs text-muted-foreground">{co.noPlanSub}</p>
                </div>
                {!activePlanId && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
              {allPlans.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setActivePlanId(p.id); setPlanPickerOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors ${activePlanId === p.id ? 'bg-primary/5' : ''}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{localizeTitle(p.title, lang)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.goal.replace('_', ' ')}</p>
                  </div>
                  {activePlanId === p.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2 flex items-center gap-2">
          {/* Bot avatar */}
          <div className="w-9 h-9 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary" />
          </div>

          {/* Thread switcher pill */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 min-w-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border hover:border-primary/40 hover:bg-secondary/80 transition-colors text-left"
            aria-label={co.switchChat}
          >
            <MessagesSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="flex-1 text-sm font-semibold text-foreground truncate">
              {activeThread ? localizeTitle(activeThread.title, lang) : co.defaultTitle}
            </span>
            {threads.length > 1 && (
              <span className="flex-shrink-0 text-[10px] font-bold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 leading-none">
                {threads.length}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewThread}
              title={co.newChat}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label={co.newChat}
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
            {hasContent && (
              <button
                onClick={handleClear}
                disabled={busy}
                title={co.clearHistory}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                aria-label={co.clearHistory}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Plan context bar — second row */}
        {allPlans.length > 0 && (
          <div className="max-w-lg mx-auto px-4 pb-2.5">
            <button
              onClick={() => setPlanPickerOpen(v => !v)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl border text-xs transition-colors ${
                activePlan
                  ? 'border-primary/30 bg-primary/8 text-primary hover:bg-primary/12'
                  : 'border-border bg-secondary text-muted-foreground hover:border-primary/30'
              }`}
              aria-label={co.pickPlan}
            >
              <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 text-left font-medium truncate">
                {activePlan ? localizeTitle(activePlan.title, lang) : co.pickPlan}
              </span>
              <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${planPickerOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {/* padding-bottom = composer (~60px) + nav (~56px) + safe area + extra breathing room */}
        <div className="max-w-lg mx-auto px-4 pt-4 flex flex-col gap-4" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>

          {/* Loading indicator when switching threads */}
          {loadingThread && (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
              </div>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && !loadingThread && (
            <div className="flex flex-col items-center text-center gap-4 pt-8">
              <div className="w-16 h-16 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{co.emptyTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xs">
                  {co.emptyDesc}
                </p>
              </div>
              {!hasPlan && (
                <div className="text-xs text-muted-foreground bg-secondary border border-border rounded-xl px-3 py-2.5 text-left w-full">
                  {co.noPlanWarning}
                </div>
              )}
              <div className="flex flex-col gap-2 w-full mt-2">
                {co.suggestions.map((sg: string) => (
                  <button
                    key={sg}
                    onClick={() => submit(sg)}
                    className="text-left text-sm text-foreground bg-card border border-border rounded-2xl px-4 py-3 hover:border-primary/40 transition-colors flex items-center gap-3"
                  >
                    <Dumbbell className="w-4 h-4 text-primary flex-shrink-0" />
                    {sg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Persisted history */}
          {history.map(item => (
            <Bubble key={item.id} role={item.role} content={item.content} />
          ))}

          {/* Separator */}
          {history.length > 0 && messages.length > 0 && (
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{co.nowLabel}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Live messages */}
          {messages.map(message => {
            const isUser = message.role === 'user'
            return (
              <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {message.parts.map((part, i) => {
                    if (part.type === 'text') {
                      if (!part.text) return null
                      return (
                        <div
                          key={i}
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-card border border-border text-foreground rounded-bl-md'
                          }`}
                        >
                          {part.text}
                        </div>
                      )
                    }
                    if (part.type.startsWith('tool-')) {
                      return <ToolChip key={i} part={part as ToolPartLike} />
                    }
                    return null
                  })}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer — sits directly above the bottom nav */}
      <div className="fixed left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto px-4 py-2.5">
          <form
            onSubmit={e => { e.preventDefault(); submit(input) }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  submit(input)
                }
              }}
              placeholder={co.inputPlaceholder}
              autoComplete="off"
              className="flex-1 bg-secondary border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="w-11 h-11 flex-shrink-0 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
              aria-label={co.sendBtn}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
