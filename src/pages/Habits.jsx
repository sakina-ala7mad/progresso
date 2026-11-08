import React, { useEffect, useMemo, useState } from 'react'

const HABITS_KEY = 'productivity_habits_v1'
const SESSIONS_KEY = 'productivity_timer_sessions_v1'
const TAGS_KEY = 'productivity_timer_tags_v1'

const COLORS = ['#67C8EA','#E46B8A','#A98AFB','#F2B84B','#79D39B','#FF9C78','#6F8CFF','#D58AE8','#56C7C0','#F28FB3','#8BCB7A','#F6A56F']
const CATEGORIES = ['Health','Study','Soul','Work','Mental','Home','Other']

function makeId(prefix='habit') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}` }
function readHabits() { try { const raw = localStorage.getItem(HABITS_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] } }
function readJson(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback } }
function writeHabits(habits) { try { localStorage.setItem(HABITS_KEY, JSON.stringify(habits)); return true } catch { return false } }
function localKey(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function fromKey(key) { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d) }
function todayKey() { return localKey(new Date()) }
function startOfWeek(date) { const d = new Date(date); d.setHours(0,0,0,0); const day = d.getDay(); const diff = day === 0 ? -6 : 1-day; d.setDate(d.getDate()+diff); return d }
function addDays(date,n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
function monthStart(date) { return new Date(date.getFullYear(),date.getMonth(),1) }
function monthEnd(date) { return new Date(date.getFullYear(),date.getMonth()+1,0) }
function fmtDate(key) { return fromKey(key).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) }
function monthLabel(date) { return date.toLocaleDateString(undefined,{month:'long',year:'numeric'}) }
function shortDay(date) { return date.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3) }
function daysInRange(start,end) { const out=[]; let d=new Date(start); d.setHours(0,0,0,0); const last=new Date(end); last.setHours(0,0,0,0); while(d<=last){out.push(new Date(d));d.setDate(d.getDate()+1)} return out }

function normalizeHabit(h) {
  return { id:h.id||makeId(), name:h.name||'New habit', color:h.color||COLORS[0], frequency:h.frequency||'daily', intervalDays:Math.max(2,Number(h.intervalDays)||2), category:h.category||'Other', size:h.size||'medium', linkedTagIds:Array.isArray(h.linkedTagIds)?h.linkedTagIds:(h.linkedTagId?[h.linkedTagId]:[]), createdAt:h.createdAt||new Date().toISOString(), completions:Array.isArray(h.completions)?h.completions:[], resetHistory:Array.isArray(h.resetHistory)?h.resetHistory:[] }
}

function completionSet(habit) { return new Set(habit.completions||[]) }
function totalChecked(habit) { return (habit.completions||[]).length }
function currentStreak(habit) {
  const set=completionSet(habit); if(!set.size) return 0
  if(habit.frequency==='weekly') {
    let cursor=startOfWeek(new Date()); let streak=0
    const currentWeekHas=daysInRange(cursor,addDays(cursor,6)).some(d=>set.has(localKey(d)))
    if(!currentWeekHas) cursor=addDays(cursor,-7)
    while(daysInRange(cursor,addDays(cursor,6)).some(d=>set.has(localKey(d)))) { streak++; cursor=addDays(cursor,-7) }
    return streak
  }
  const interval=habit.frequency==='interval'?Math.max(2,Number(habit.intervalDays)||2):1
  let cursor=fromKey(todayKey())
  if(!set.has(localKey(cursor))) {
    cursor=addDays(cursor,-interval)
    if(!set.has(localKey(cursor))) return 0
  }
  let streak=0
  while(set.has(localKey(cursor))) { streak++; cursor=addDays(cursor,-interval) }
  return streak
}
function longestStreak(habit) {
  const keys=[...(habit.completions||[])].sort(); if(!keys.length) return 0
  const set=completionSet(habit)
  if(habit.frequency==='weekly') {
    const weeks=[...new Set(keys.map(k=>localKey(startOfWeek(fromKey(k)))))].sort(); let best=1,run=1
    for(let i=1;i<weeks.length;i++){const prev=fromKey(weeks[i-1]), cur=fromKey(weeks[i]); if(Math.round((cur-prev)/86400000)===7){run++;best=Math.max(best,run)}else run=1} return best
  }
  const interval=habit.frequency==='interval'?Math.max(2,Number(habit.intervalDays)||2):1
  let best=1,run=1
  for(let i=1;i<keys.length;i++){const diff=Math.round((fromKey(keys[i])-fromKey(keys[i-1]))/86400000); if(diff===interval){run++;best=Math.max(best,run)}else run=1}
  return best
}
function frequencyLabel(h) { if(h.frequency==='daily') return 'Everyday'; if(h.frequency==='weekly') return 'Every week'; return `Every ${h.intervalDays} days` }
function getWeekDays(base=new Date()) { const start=startOfWeek(base); return Array.from({length:7},(_,i)=>addDays(start,i)) }

export default function Habits({ onNavigate }) {
  const [habits,setHabits]=useState(()=>readHabits().map(normalizeHabit))
  const [availableTags,setAvailableTags]=useState(()=>readJson(TAGS_KEY,[]))
  const [view,setView]=useState('list')
  const [selectedId,setSelectedId]=useState(null)
  const [calendarOpen,setCalendarOpen]=useState(false)
  const [modal,setModal]=useState(null)
  const [calendarMonth,setCalendarMonth]=useState(monthStart(new Date()))

  const selected=habits.find(h=>h.id===selectedId)||null
  function commit(next) { setHabits(next); writeHabits(next) }
  useEffect(() => {
    const syncFromSessions = () => {
      const tags = readJson(TAGS_KEY, []); setAvailableTags(tags)
      const sessions = readJson(SESSIONS_KEY, []); const today = todayKey()
      const next = habits.map(h => {
        const linkedTagIds = Array.isArray(h.linkedTagIds) ? h.linkedTagIds : (h.linkedTagId ? [h.linkedTagId] : [])
        if (!linkedTagIds.length || h.completions.includes(today)) return h
        const linkedTags = tags.filter(t => linkedTagIds.includes(t.id))
        const minutes = sessions.reduce((sum, session) => {
          if (localKey(session.timestamp) !== today) return sum
          const matches = session.tagId ? linkedTagIds.includes(session.tagId) : linkedTags.some(tag => session.tagName === tag.name)
          return sum + (matches ? Number(session.durationMinutes || 0) : 0)
        }, 0)
        return minutes >= 60 ? { ...h, completions: [...h.completions, today].sort() } : h
      })
      if (next.some((h,i) => h !== habits[i])) commit(next)
    }
    syncFromSessions()
    window.addEventListener('productivity:sessions-updated', syncFromSessions)
    window.addEventListener('storage', syncFromSessions)
    return () => { window.removeEventListener('productivity:sessions-updated', syncFromSessions); window.removeEventListener('storage', syncFromSessions) }
  }, [habits])
  function toggleDay(habitId,key) {
    const next=habits.map(h=>{ if(h.id!==habitId)return h; const set=completionSet(h); if(set.has(key))set.delete(key); else set.add(key); return {...h,completions:[...set].sort()} })
    commit(next)
  }
  function openDetail(habit) { setSelectedId(habit.id); setView('detail'); setCalendarOpen(false); setCalendarMonth(monthStart(new Date())) }
  function openAdd() { setModal({type:'edit',habit:null}) }
  function openEdit(habit) { setModal({type:'edit',habit}) }
  function deleteHabit(habit) {
    if(!window.confirm(`Delete “${habit.name}”? Its completion history will also be removed from this device.`)) return
    const next=habits.filter(h=>h.id!==habit.id); commit(next); if(selectedId===habit.id){setSelectedId(null);setView('list')}
  }
  function resetHabit(habit) {
    if(!window.confirm(`Reset progress for “${habit.name}”? Current check-ins will be archived and the active streak will return to 0.`)) return
    const next=habits.map(h=>h.id===habit.id?{...h,completions:[],resetHistory:[...(h.resetHistory||[]),{at:new Date().toISOString(),daysChecked:h.completions.length}]}:h); commit(next)
  }
  function saveHabit(draft) {
    const name=draft.name.trim(); if(!name)return
    if(draft.id) commit(habits.map(h=>h.id===draft.id?{...h,...draft,name}:h))
    else commit([...habits,{...draft,id:makeId(),createdAt:new Date().toISOString(),completions:[],resetHistory:[]}])
    setModal(null)
  }

  return <section className="w-full max-w-none">
    {view==='list' && <>
      <div className="mb-4 flex items-end justify-between gap-3 px-1"><div><h1 className="text-2xl font-bold">Habit Tracker</h1><p className="mt-1 text-sm text-neutral-500">Build consistency one check-in at a time.</p></div><button className="soft-button rounded-xl px-3 py-2 text-xs font-bold" onClick={openAdd}>+ Add habit</button></div>
      {!habits.length ? <EmptyHabits onAdd={openAdd}/> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{habits.map(h=><HabitCard key={h.id} habit={h} onOpen={openDetail} onToggle={toggleDay}/>)}</div>}
      <button className="mt-4 w-full rounded-2xl border-2 border-neutral-400 bg-white/80 px-5 py-3 text-base font-bold shadow-sm hover:bg-white" onClick={openAdd}>add habit</button>
    </>}
    {view==='detail' && selected && <HabitDetail habit={selected} onBack={()=>setView('list')} onEdit={()=>openEdit(selected)} onDelete={()=>deleteHabit(selected)} onReset={()=>resetHabit(selected)} onToggle={toggleDay} calendarOpen={calendarOpen} setCalendarOpen={setCalendarOpen} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth} onInvite={()=>setModal({type:'invite',habit:selected})}/>} 
    {modal?.type==='edit' && <HabitEditor habit={modal.habit} tags={availableTags} onClose={()=>setModal(null)} onSave={saveHabit}/>} 
    {modal?.type==='invite' && <InviteModal habit={modal.habit} onClose={()=>setModal(null)}/>} 
  </section>
}

function HabitCard({habit,onOpen,onToggle}) {
  const week=getWeekDays(); const set=completionSet(habit); const today=todayKey(); const checkedToday=set.has(today)
  const size=habit.size||'medium'
  return <article className={`habit-card habit-${size}`} onClick={()=>onOpen(habit)}>
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-bold">{habit.name}</h2><div className="mt-1 text-xs text-neutral-500">{frequencyLabel(habit)} <span className="mx-1">•</span> {habit.category}</div></div><div className="flex shrink-0 items-center gap-1 text-xs font-bold" style={{color:habit.color}}><span className="text-base">🔥</span>{currentStreak(habit)}</div></div>
    {size==='big' ? <MiniMonth habit={habit}/> : size==='medium' ? <WeekRow habit={habit} days={week} onToggle={onToggle}/> : <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50/80 px-3 py-2"><span className="text-xs font-semibold text-neutral-500">Today</span><DayCircle date={new Date()} checked={checkedToday} color={habit.color} onClick={(e)=>{e.stopPropagation();onToggle(habit.id,today)}}/></div>}
    <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400"><span>{totalChecked(habit)} total checked</span><span>Open details →</span></div>
  </article>
}
function WeekRow({habit,days,onToggle}) { const set=completionSet(habit); return <div className="mt-3 grid grid-cols-7 gap-1">{days.map(d=><div key={localKey(d)} className="text-center"><div className="mb-1 text-[9px] font-semibold text-neutral-400">{shortDay(d)}</div><DayCircle date={d} checked={set.has(localKey(d))} color={habit.color} onClick={(e)=>{e.stopPropagation();onToggle(habit.id,localKey(d))}}/></div>)}</div> }
function MiniMonth({habit}) { const set=completionSet(habit); const start=monthStart(new Date()); const end=monthEnd(start); const lead=(start.getDay()+6)%7; const cells=[]; for(let i=0;i<lead;i++)cells.push(null); for(let d=1;d<=end.getDate();d++)cells.push(new Date(start.getFullYear(),start.getMonth(),d)); return <div className="mt-3 rounded-xl border border-violet-100 bg-white/60 p-2"><div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{monthLabel(start)}</div><div className="grid grid-cols-7 gap-1 text-center">{['M','T','W','T','F','S','S'].map((x,i)=><div key={i} className="text-[8px] font-bold text-neutral-300">{x}</div>)}{cells.map((d,i)=>d?<div key={i} className={`flex h-5 items-center justify-center rounded-full text-[8px] ${set.has(localKey(d))?'font-bold text-white':'text-neutral-400'}`} style={set.has(localKey(d))?{backgroundColor:habit.color}:{}}>{d.getDate()}</div>:<div key={i}/>)}</div></div> }
function DayCircle({date,checked,color,onClick}) { const isToday=localKey(date)===todayKey(); return <button aria-label={`${localKey(date)} ${checked?'completed':'not completed'}`} onClick={onClick} className={`habit-day ${checked?'checked':''} ${isToday?'today':''}`} style={checked?{backgroundColor:color,borderColor:color}:{}}>{checked?'✓':''}</button> }

function HabitDetail({habit,onBack,onEdit,onDelete,onReset,onToggle,calendarOpen,setCalendarOpen,calendarMonth,setCalendarMonth,onInvite}) {
  const current=currentStreak(habit), longest=longestStreak(habit), total=totalChecked(habit)
  const pct=habit.completions.length ? Math.min(100,Math.round((current/Math.max(longest,current,1))*100)) : 0
  return <div className="gloss-panel rounded-3xl p-4 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3"><button className="soft-button rounded-xl px-3 py-2 text-xs font-bold" onClick={onBack}>‹ Habits</button><div className="text-center"><div className="flex items-center justify-center gap-2"><span className="h-3 w-3 rounded-full" style={{backgroundColor:habit.color}}/><h1 className="text-xl font-bold">{habit.name}</h1></div><p className="mt-1 text-xs text-neutral-500">{frequencyLabel(habit)} · {habit.category}</p></div><button className="soft-button rounded-xl px-3 py-2 text-xs font-bold" onClick={onEdit}>Edit</button></div>
    <div className="rounded-2xl border border-violet-100 bg-white/70 p-4"><div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Overall</div><div className="grid grid-cols-[112px_1fr] items-center gap-4"><div className="relative mx-auto h-24 w-24 rounded-full" style={{background:`conic-gradient(${habit.color} ${pct}%, #e9e9e9 0)`}}><div className="absolute inset-2 flex items-center justify-center rounded-full bg-white text-lg font-bold">{pct}%</div></div><div className="space-y-2 text-sm"><div><span className="font-bold">{current}</span> current streak</div><div><span className="font-bold">{longest}</span> longest streak</div><div><span className="font-bold">{total}</span> total days checked</div></div></div></div>
    <div className="mt-4 rounded-2xl border border-violet-100 bg-white/70 p-4"><div className="mb-3 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">This week</div><div className="mt-1 text-xs text-neutral-500">Tap a day to mark it complete.</div></div><span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{backgroundColor:`${habit.color}22`,color:habit.color}}>{habit.completions.includes(todayKey())?'Done today':'Not done today'}</span></div><WeekRow habit={habit} days={getWeekDays()} onToggle={onToggle}/></div>
    <div className="mt-4 flex flex-wrap gap-2"><button className="soft-button rounded-xl px-3 py-2 text-xs font-bold" onClick={()=>setCalendarOpen(!calendarOpen)}>▣ {calendarOpen?'Hide Calendar':'Show Calendar'}</button><button className="soft-button rounded-xl px-3 py-2 text-xs font-bold" onClick={onInvite}>♧ Invite</button><button className="soft-button rounded-xl px-3 py-2 text-xs font-bold" onClick={onReset}>↻ Reset Progress</button><button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-500" onClick={onDelete}>♜ Delete Habit</button></div>
    {calendarOpen && <CalendarPanel habit={habit} month={calendarMonth} setMonth={setCalendarMonth} onToggle={onToggle}/>} 
  </div>
}

function CalendarPanel({habit,month,setMonth,onToggle}) {
  const visibleMonths = Array.from({length: 6}, (_, i) => new Date(month.getFullYear(), month.getMonth()+i, 1))
  return <div className="mt-4 rounded-2xl border border-violet-100 bg-white/70 p-4">
    <div className="mb-4 flex items-center justify-between">
      <button className="soft-button rounded-lg px-2 py-1 text-xs font-bold" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button>
      <div className="text-sm font-bold">Calendar</div>
      <button className="soft-button rounded-lg px-2 py-1 text-xs font-bold" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button>
    </div>
    <div className="max-h-[560px] space-y-5 overflow-y-auto pr-1">
      {visibleMonths.map(m=><MonthCalendar key={`${m.getFullYear()}-${m.getMonth()}`} habit={habit} month={m} onToggle={onToggle}/>) }
    </div>
    <p className="mt-3 text-center text-[10px] text-neutral-400">Scroll to see more months. Checked days are saved instantly.</p>
  </div>
}

function MonthCalendar({habit,month,onToggle}) {
  const start=monthStart(month), end=monthEnd(month), lead=(start.getDay()+6)%7, cells=[]
  for(let i=0;i<lead;i++) cells.push(null)
  for(let d=1;d<=end.getDate();d++) cells.push(new Date(start.getFullYear(),start.getMonth(),d))
  const set=completionSet(habit)
  return <div>
    <div className="mb-2 text-sm font-bold">{monthLabel(start)}</div>
    <div className="grid grid-cols-7 gap-1.5 text-center">
      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div key={d} className="text-[9px] font-bold text-neutral-400">{d}</div>)}
      {cells.map((d,i)=>d?<button key={i} onClick={()=>onToggle(habit.id,localKey(d))} className={`calendar-day ${set.has(localKey(d))?'checked':''} ${localKey(d)===todayKey()?'today':''}`} style={set.has(localKey(d))?{backgroundColor:habit.color,borderColor:habit.color}:{}}>{d.getDate()}</button>:<div key={i}/>) }
    </div>
  </div>
}

function HabitEditor({habit,tags=[],onClose,onSave}) {
  const initial = habit || {name:'',color:COLORS[0],frequency:'daily',intervalDays:3,category:'Health',size:'medium',linkedTagIds:[]}
  const [draft,setDraft] = useState(() => ({...initial, linkedTagIds:Array.isArray(initial.linkedTagIds)?initial.linkedTagIds:(initial.linkedTagId?[initial.linkedTagId]:[])}))
  const update = (k,v) => setDraft(d=>({...d,[k]:v}))
  const toggleLinkedTag = id => update('linkedTagIds', draft.linkedTagIds.includes(id) ? draft.linkedTagIds.filter(x=>x!==id) : [...draft.linkedTagIds,id])
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"><div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{habit?'Edit habit':'Add habit'}</h2><button onClick={onClose} className="rounded-lg px-2 py-1 text-neutral-400">×</button></div><div className="max-h-[560px] space-y-4 overflow-y-auto pr-1">
    <label className="block text-xs font-bold text-neutral-500">Habit name<input autoFocus value={draft.name} onChange={e=>update('name',e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-violet-400" placeholder="e.g. Reading"/></label>
    <div><div className="mb-2 text-xs font-bold text-neutral-500">Color</div><div className="flex flex-wrap gap-2">{COLORS.map(c=><button key={c} onClick={()=>update('color',c)} className={`h-8 w-8 rounded-full border-2 ${draft.color===c?'border-black':'border-white'} shadow`} style={{backgroundColor:c}}/>)}</div><label className="mt-2 flex items-center gap-2 text-xs font-semibold text-neutral-500">Custom<input type="color" value={draft.color} onChange={e=>update('color',e.target.value)} className="h-8 w-10 cursor-pointer rounded"/></label></div>
    <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-neutral-500">Frequency<select value={draft.frequency} onChange={e=>update('frequency',e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="daily">Everyday</option><option value="weekly">Every week</option><option value="interval">Every X days</option></select></label>{draft.frequency==='interval'?<label className="text-xs font-bold text-neutral-500">Days<select value={draft.intervalDays} onChange={e=>update('intervalDays',Math.max(2,Number(e.target.value)||2))} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm">{Array.from({length:28},(_,i)=><option key={i+2} value={i+2}>{i+2} days</option>)}</select></label>:<label className="text-xs font-bold text-neutral-500">Category<select value={draft.category} onChange={e=>update('category',e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>}</div>
    {draft.frequency==='interval'&&<label className="block text-xs font-bold text-neutral-500">Category<select value={draft.category} onChange={e=>update('category',e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>}
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3"><div className="text-xs font-bold text-neutral-700">Automatically complete from timer tags</div><p className="mt-1 text-[11px] leading-5 text-neutral-500">Choose one or more tags. Sessions from any selected tag count toward the 1-hour daily goal. Leave all unchecked to complete this habit manually.</p><div className="mt-3 grid grid-cols-2 gap-2">{tags.map(tag=><label key={tag.id} className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold ${draft.linkedTagIds.includes(tag.id)?'border-violet-300 bg-white text-violet-800':'border-neutral-200 bg-white/60 text-neutral-600'}`}><input type="checkbox" checked={draft.linkedTagIds.includes(tag.id)} onChange={()=>toggleLinkedTag(tag.id)} className="accent-violet-600"/><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{background:tag.color}}/><span className="truncate">{tag.name}</span></label>)}</div>{!tags.length&&<p className="mt-2 text-xs text-neutral-500">Create tags in Timer first.</p>}</div>
    <div><div className="mb-2 text-xs font-bold text-neutral-500">Card size</div><div className="grid grid-cols-3 gap-2">{[['small','Today'],['medium','Week'],['big','Month']].map(([v,label])=><button key={v} onClick={()=>update('size',v)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${draft.size===v?'border-violet-400 bg-violet-100 text-violet-700':'border-neutral-200 bg-neutral-50'}`}>{label}</button>)}</div></div>
    <div className="flex justify-end gap-2 pt-2"><button className="soft-button rounded-xl px-4 py-2 text-sm font-bold" onClick={onClose}>Cancel</button><button className="rounded-xl border border-violet-500 bg-violet-500 px-4 py-2 text-sm font-bold text-white" onClick={()=>onSave({...draft,linkedTagId:draft.linkedTagIds[0]||''})}>Save</button></div>
  </div></div></div>
}
function InviteModal({habit,onClose}) { const [email,setEmail]=useState(''); return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-bold">Invite to “{habit.name}”</h2><p className="mt-1 text-xs text-neutral-500">Collaboration is local-only for now. This prepares the workflow without sending anything.</p><input value={email} onChange={e=>setEmail(e.target.value)} className="mt-4 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm" placeholder="name@example.com"/><div className="mt-4 flex justify-end gap-2"><button className="soft-button rounded-xl px-4 py-2 text-sm font-bold" onClick={onClose}>Cancel</button><button className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white" onClick={()=>{window.alert(email?'Invite saved as a local draft.':'Enter an email address first.');if(email)onClose()}}>Invite</button></div></div></div> }
function EmptyHabits({onAdd}) { return <div className="gloss-panel rounded-3xl p-8 text-center"><div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl">✓</div><h2 className="text-lg font-bold">No habits yet</h2><p className="mt-1 text-sm text-neutral-500">Add your first habit and start building a streak.</p><button className="mt-4 rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white" onClick={onAdd}>Add habit</button></div> }

export { HABITS_KEY }
