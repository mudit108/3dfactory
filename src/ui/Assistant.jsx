import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { answer, SUGGESTIONS } from '../services/assistant'
import { focusOnKey } from '../scene/focus'
import { useViewport } from '../hooks/useViewport'

function goLoom(id) {
  useFactoryStore.getState().select({ type: 'machine', id, key: `machine:${id}` })
  setTimeout(() => focusOnKey(`machine:${id}`), 0)
}

function Bubble({ m, onAsk }) {
  if (m.role === 'user')
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-500/90 px-3 py-2 text-sm text-slate-950">{m.text}</div>
      </div>
    )
  const r = m.reply
  return (
    <div className="flex gap-2">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10"><Bot size={14} /></div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="rounded-2xl rounded-tl-sm bg-white/8 px-3 py-2 text-sm leading-relaxed text-slate-100" style={{ background: 'rgba(255,255,255,0.07)' }}>
          {r.lines.map((l, i) => <p key={i} className={i ? 'mt-1.5' : ''}>{l}</p>)}
          {r.rows?.length > 0 && (
            <div className="mt-2 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
              {r.rows.map((row, i) => (
                <button
                  key={i}
                  disabled={!row.id}
                  onClick={() => row.id && goLoom(row.id)}
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-white/10 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{row.left}</span>
                    {row.sub && <span className="block truncate text-[11px] text-slate-400">{row.sub}</span>}
                  </span>
                  <span className={`shrink-0 text-[13px] font-semibold ${row.tone === 'good' ? 'text-emerald-400' : row.tone === 'bad' ? 'text-rose-400' : 'text-slate-200'}`}>{row.right}</span>
                </button>
              ))}
            </div>
          )}
          {r.note && <p className="mt-2 text-[11px] text-amber-300/80">{r.note}</p>}
        </div>
        {r.chips?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.chips.map((c) => (
              <button key={c} onClick={() => onAsk(c)} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10">{c}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Assistant() {
  const mode = useFactoryStore((s) => s.mode)
  const selected = useFactoryStore((s) => s.selected)
  const { mobile } = useViewport()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [msgs, setMsgs] = useState([])
  const endRef = useRef(null)

  const ask = (q) => {
    q = (q || '').trim()
    if (!q) return
    const st = useFactoryStore.getState()
    let reply
    try {
      reply = answer(q, { machines: st.machines, summary: st.emsSummary, staffing: st.staffing })
    } catch (e) {
      reply = { lines: ['Sorry, I could not work that out. Try "factory summary".'] }
    }
    setMsgs((m) => [...m, { role: 'user', text: q }, { role: 'bot', reply }])
    setText('')
    if (reply.focus) goLoom(reply.focus)
  }

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])

  if (mode === 'walk' || mode === 'fly' || mode === 'present') return null
  if (mobile && selected && !open) return null

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className={`fixed z-40 flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/40 hover:bg-cyan-400 ${mobile ? 'bottom-20 right-3' : 'bottom-5 left-5'}`}
      >
        <MessageCircle size={18} /> Ask
      </button>
    )

  return (
    <div
      className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-white/10 text-slate-100 shadow-2xl ${mobile ? 'inset-x-2 bottom-2 top-16' : 'bottom-5 left-5 top-[120px] w-[380px]'}`}
      style={{ background: 'rgba(10,14,22,0.94)', backdropFilter: 'blur(14px)' }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Bot size={16} /> Factory assistant</div>
        <button onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 hover:bg-white/10"><X size={16} /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Ask me about looms, beams, production or efficiency. English and Hinglish both work.</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((c) => (
                <button key={c} onClick={() => ask(c)} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10">{c}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => <Bubble key={i} m={m} onAsk={ask} />)}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(text) }} className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. WJ-12, beams finishing, kitna kapda"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400"
        />
        <button type="submit" aria-label="Send" className="rounded-lg bg-cyan-500 px-3 text-slate-950 hover:bg-cyan-400"><Send size={16} /></button>
      </form>
    </div>
  )
}
