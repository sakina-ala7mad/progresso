import React, { useEffect, useMemo, useRef, useState } from 'react'

const NOTES_KEY = 'productivity_notes_workspace_v1'
const TAGS_KEY = 'productivity_timer_tags_v1'
const makeId = () => `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const read = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback } catch { return fallback } }
const COLORS = ['#FDE68A', '#FDBA74', '#93C5FD', '#86EFAC', '#F9A8D4', '#C4B5FD', '#111827', '#FFFFFF', '#FCA5A5', '#D1D5DB']
const TEXT_COLORS = ['#FACC15', '#F97316', '#3B82F6', '#16A34A', '#EC4899', '#9333EA', '#111827', '#FFFFFF', '#EF4444', '#6B7280']
const darkShade = (hex) => '#' + [0,2,4].map(i => Math.max(0, Math.round(parseInt(hex.slice(i+1,i+3),16)*.58)).toString(16).padStart(2,'0')).join('')
const plain = (html = '') => { const el = document.createElement('div'); el.innerHTML = html; return el.textContent || el.innerText || '' }

export default function Notes() {
  const [workspace, setWorkspace] = useState(() => {
    const old = read(NOTES_KEY, { folders: [{ id: 'inbox', name: 'All notes' }], notes: [] })
    return { folders: (old.folders || []).map((f, i) => ({ parentId: null, order: i, ...f })), notes: (old.notes || []).map((n, i) => ({ deletedAt: null, order: i, tagIds: n.tagIds || [], bodyHtml: n.bodyHtml || (n.body ? `<p>${String(n.body).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>` : ''), ...n })) }
  })
  const [tags] = useState(() => read(TAGS_KEY, []))
  const [folderId, setFolderId] = useState('inbox')
  const [activeId, setActiveId] = useState(null)
  const [query, setQuery] = useState('')
  const [folderName, setFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [trashView, setTrashView] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState(() => ({}))
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [trashPreview, setTrashPreview] = useState(null)
  const editorRef = useRef(null)
  const active = workspace.notes.find(n => n.id === activeId && !n.deletedAt) || null
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(workspace)) }, [workspace])
  useEffect(() => { if (active && editorRef.current && editorRef.current.innerHTML !== (active.bodyHtml || '')) editorRef.current.innerHTML = active.bodyHtml || '' }, [activeId])

  const liveFolders = workspace.folders.filter(f => f.id !== 'inbox' && !f.deletedAt)
  const liveNotes = workspace.notes.filter(n => !n.deletedAt)
  const trashNotes = workspace.notes.filter(n => n.deletedAt)
  const trashFolders = workspace.folders.filter(f => f.id !== 'inbox' && f.deletedAt)
  const descendants = (id) => { const ids = [id]; liveFolders.filter(f => f.parentId === id).forEach(f => ids.push(...descendants(f.id))); return ids }
  const folderNotes = (id) => liveNotes.filter(n => n.folderId === id)
  const visibleNotes = useMemo(() => liveNotes.filter(n => (folderId === 'inbox' || n.folderId === folderId) && `${n.title} ${plain(n.bodyHtml || n.body || '')}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || b.updatedAt-a.updatedAt), [workspace, folderId, query])

  function createNote() {
    const target = folderId === 'inbox' ? (liveFolders[0]?.id || 'inbox') : folderId
    const note = { id: makeId(), folderId: target, title: 'Untitled note', body: '', bodyHtml: '', tagIds: [], updatedAt: Date.now(), order: Date.now() }
    setWorkspace(w => ({ ...w, notes: [note, ...w.notes] })); setActiveId(note.id); setTrashView(false)
  }
  function updateNote(patch) { setWorkspace(w => ({ ...w, notes: w.notes.map(n => n.id === activeId ? { ...n, ...patch, updatedAt: Date.now() } : n) })) }
  function createFolder() {
    const name = folderName.trim(); if (!name) return
    const folder = { id: makeId(), name, parentId: folderId === 'inbox' ? null : folderId, order: Date.now() }
    setWorkspace(w => ({ ...w, folders: [...w.folders, folder] })); setFolderId(folder.id); setFolderName(''); setShowNewFolder(false)
  }
  function toggleTag(id) { updateNote({ tagIds: (active.tagIds || []).includes(id) ? active.tagIds.filter(x => x !== id) : [...(active.tagIds || []), id] }) }
  function moveNote(id, target) { setWorkspace(w => ({ ...w, notes: w.notes.map(n => n.id === id ? { ...n, folderId: target, order: Date.now() } : n) })) }
  function moveFolder(id, target) {
    if (id === target || (target && descendants(id).includes(target))) return
    setWorkspace(w => ({ ...w, folders: w.folders.map(f => f.id === id ? { ...f, parentId: target || null, order: Date.now() } : f) }))
  }
  function shiftOrder(kind, id, direction) {
    setWorkspace(w => {
      const items = kind === 'folder' ? w.folders.filter(x => (x.parentId || null) === (w.folders.find(f => f.id === id)?.parentId || null) && x.id !== 'inbox' && !x.deletedAt) : w.notes.filter(x => x.folderId === w.notes.find(n => n.id === id)?.folderId && !x.deletedAt)
      items.sort((a,b) => (a.order ?? 0) - (b.order ?? 0))
      const i = items.findIndex(x => x.id === id), j = i + direction
      if (i < 0 || j < 0 || j >= items.length) return w
      const a = items[i], b = items[j]
      return kind === 'folder' ? { ...w, folders: w.folders.map(f => f.id === a.id ? { ...f, order: b.order ?? j } : f.id === b.id ? { ...f, order: a.order ?? i } : f) } : { ...w, notes: w.notes.map(n => n.id === a.id ? { ...n, order: b.order ?? j } : n.id === b.id ? { ...n, order: a.order ?? i } : n) }
    })
  }
  function trashFolder(id) {
    const ids = descendants(id)
    const hasNotes = workspace.notes.some(n => ids.includes(n.folderId) && !n.deletedAt)
    if (ids.length > 1 || hasNotes) { alert('This folder is not empty. Move or delete its notes and subfolders first.'); return }
    if (!confirm('Move this empty folder to Recently Deleted?')) return
    const stamp = Date.now()
    setWorkspace(w => ({ ...w, folders: w.folders.map(f => ids.includes(f.id) ? { ...f, deletedAt: stamp } : f), notes: w.notes.map(n => ids.includes(n.folderId) ? { ...n, deletedAt: stamp } : n) }))
    if (ids.includes(folderId)) setFolderId('inbox'); setActiveId(null)
  }
  function trashNote(id) { setWorkspace(w => ({ ...w, notes: w.notes.map(n => n.id === id ? { ...n, deletedAt: Date.now() } : n) })); setActiveId(null) }
  function restoreNote(id) { setWorkspace(w => ({ ...w, notes: w.notes.map(n => n.id === id ? { ...n, deletedAt: null } : n) })) }
  function restoreFolder(id) {
    const all = workspace.folders; const ids = [id]; let changed = true
    while (changed) { changed = false; all.forEach(f => { if (f.deletedAt && ids.includes(f.parentId) && !ids.includes(f.id)) { ids.push(f.id); changed = true } }) }
    setWorkspace(w => ({ ...w, folders: w.folders.map(f => ids.includes(f.id) ? { ...f, deletedAt: null } : f), notes: w.notes.map(n => ids.includes(n.folderId) ? { ...n, deletedAt: null } : n) }))
  }
  function permanentlyDeleteNote(id) { if (confirm('Permanently delete this note? This cannot be undone.')) setWorkspace(w => ({ ...w, notes: w.notes.filter(n => n.id !== id) })) }
  function permanentlyDeleteFolder(id) { const ids = [id]; let changed = true; while (changed) { changed = false; workspace.folders.forEach(f => { if (ids.includes(f.parentId) && !ids.includes(f.id)) { ids.push(f.id); changed = true } }) }; if (ids.length > 1 || workspace.notes.some(n => ids.includes(n.folderId))) { alert('This folder still contains files or subfolders. Delete them individually first.'); return }; if (!confirm('Permanently delete this empty folder? This cannot be undone.')) return; setWorkspace(w => ({ ...w, folders: w.folders.filter(f => !ids.includes(f.id)) })); setTrashPreview(null) }
  function format(command, value) { editorRef.current?.focus(); document.execCommand(command, false, value); saveEditor() }
  function openTrashPreview(kind, id) { setTrashPreview({ kind, id }) }
  const previewNote = trashPreview?.kind === 'note' ? trashNotes.find(n => n.id === trashPreview.id) : null
  const previewFolder = trashPreview?.kind === 'folder' ? trashFolders.find(f => f.id === trashPreview.id) : null
  const previewFolderIds = previewFolder ? (() => { const ids = [previewFolder.id]; let changed = true; while (changed) { changed = false; trashFolders.forEach(f => { if (ids.includes(f.parentId) && !ids.includes(f.id)) { ids.push(f.id); changed = true } }) }; return ids })() : []
  function saveEditor() { if (editorRef.current) updateNote({ bodyHtml: editorRef.current.innerHTML, body: plain(editorRef.current.innerHTML) }) }
  function keyShortcuts(e) { const mod = e.metaKey || e.ctrlKey; if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); format('bold'); return } if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); format('italic'); return } if (mod && e.shiftKey && e.key.toLowerCase() === 'x') { e.preventDefault(); format('strikeThrough'); return } if (mod && e.altKey && ['1','2','3','0'].includes(e.key)) { e.preventDefault(); format('formatBlock', e.key === '0' ? 'p' : `h${e.key}`); return } if (e.key === '-' && editorRef.current) { const sel = window.getSelection(); if (sel?.anchorNode?.textContent?.trim() === '--' && sel.anchorOffset === sel.anchorNode.textContent.length) { e.preventDefault(); document.execCommand('insertHorizontalRule'); saveEditor() } } }
  function toggleFolderExpanded(id) { setExpandedFolders(v => ({ ...v, [id]: !(v[id] ?? true) })) }
  function resizeSidebar(e) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth
    const move = ev => setSidebarWidth(Math.max(210, Math.min(520, startWidth + ev.clientX - startX)))
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
  }
  function OutlineIcon({ type }) {
    return type === 'folder' ? <svg aria-hidden="true" viewBox="0 0 24 24" className="notes-tree-icon"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.8 9h16.4"/></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" className="notes-tree-icon"><path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/></svg>
  }
  function renderFolder(folder, depth = 0) {
    const children = liveFolders.filter(f => (f.parentId || null) === folder.id).sort((a,b)=>(a.order ?? 0)-(b.order ?? 0))
    const notes = liveNotes.filter(n => n.folderId === folder.id).sort((a,b)=>(a.order ?? 0)-(b.order ?? 0) || (b.updatedAt || 0)-(a.updatedAt || 0))
    const expanded = expandedFolders[folder.id] ?? true
    const selected = folderId === folder.id && !activeId
    return <div key={folder.id} className="notes-tree-node">
      <div className={`notes-tree-row group ${selected?'is-active':''}`} style={{ paddingLeft: 7 + depth * 15 }}>
        <button type="button" className="notes-tree-disclosure" aria-label={`${expanded?'Collapse':'Expand'} ${folder.name}`} aria-expanded={expanded} onClick={()=>toggleFolderExpanded(folder.id)}>{children.length || notes.length ? <svg viewBox="0 0 16 16" className={`notes-tree-chevron ${expanded?'is-open':''}`}><path d="m5 6 3 3 3-3"/></svg> : <span className="notes-tree-spacer"/>}</button>
        <button onClick={()=>{setFolderId(folder.id);setTrashView(false);setActiveId(null)}} className="notes-tree-label"><OutlineIcon type="folder"/><span className="notes-tree-name" title={folder.name}>{folder.name}</span><span className="notes-tree-count">{notes.length}</span></button>
        <button title="Move up" onClick={()=>shiftOrder('folder',folder.id,-1)} className="notes-tree-action">↑</button><button title="Move down" onClick={()=>shiftOrder('folder',folder.id,1)} className="notes-tree-action">↓</button>
        <select title="Move folder" aria-label="Move folder" value={folder.parentId || ''} onChange={e=>moveFolder(folder.id,e.target.value || null)} className="notes-tree-move"><option value="">↗</option><option value="" disabled>Move to…</option>{liveFolders.filter(f=>f.id!==folder.id && !descendants(folder.id).includes(f.id)).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <button title="Delete folder" aria-label={`Delete ${folder.name}`} onClick={()=>trashFolder(folder.id)} className="notes-tree-delete"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 6V4.5h4V6m-6 0 .7 9.2h6.6L14 6M8.3 8.5v4.8m3.4-4.8v4.8"/></svg></button>
      </div>
      {expanded && <div className="notes-tree-children">
        {notes.map(n=><button key={n.id} onClick={()=>{setFolderId(folder.id);setActiveId(n.id);setTrashView(false)}} className={`notes-tree-file ${activeId===n.id?'is-active':''}`} style={{paddingLeft: 31 + depth * 15}} title={n.title || 'Untitled note'}><OutlineIcon type="file"/><span className="notes-tree-name">{n.title || 'Untitled note'}</span></button>)}
        {children.map(child=>renderFolder(child,depth+1))}
      </div>}
    </div>
  }

  return <section className="notes-shell gloss-panel w-full rounded-3xl p-4 sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Notes</h2><p className="text-xs text-neutral-500">A calm space for your thoughts and ideas</p></div><button onClick={createNote} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white">＋ New note</button></div>
    <div className="notes-workspace-grid grid gap-0" style={{gridTemplateColumns:`${sidebarWidth}px 10px minmax(0,1fr)`}}>
      <aside className="notes-sidebar rounded-2xl border border-violet-100 bg-white/60 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-neutral-400">Folders</span><button className="text-lg text-violet-500" title="New folder" onClick={()=>setShowNewFolder(v=>!v)}>＋</button></div>
        {showNewFolder && <div className="mb-3 flex gap-1"><input autoFocus value={folderName} onChange={e=>setFolderName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createFolder()} placeholder="Folder name" className="min-w-0 w-full rounded-lg border px-2 py-1 text-xs"/><button onClick={createFolder} className="rounded-lg bg-violet-500 px-2 text-xs text-white">Add</button></div>}
        <button onClick={()=>{setFolderId('inbox');setTrashView(false);setActiveId(null)}} className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${folderId==='inbox'&&!trashView?'bg-violet-100 font-bold text-violet-700':'text-neutral-600 hover:bg-violet-50'}`}>All notes <span className="float-right text-xs opacity-60">{liveNotes.length}</span></button>
        {liveFolders.filter(f=>!f.parentId).sort((a,b)=>(a.order??0)-(b.order??0)).map(f=>renderFolder(f))}
        {liveNotes.filter(n=>!n.folderId || n.folderId==='inbox').map(n=><button key={n.id} onClick={()=>{setFolderId('inbox');setActiveId(n.id);setTrashView(false)}} className={`notes-tree-file ${activeId===n.id?'is-active':''}`} title={n.title || 'Untitled note'}><OutlineIcon type="file"/><span className="notes-tree-name">{n.title || 'Untitled note'}</span></button>)}
        <button onClick={()=>{setTrashView(true);setActiveId(null)}} className={`mt-4 w-full rounded-lg px-3 py-2 text-left text-sm ${trashView?'bg-rose-50 font-bold text-rose-600':'text-neutral-500 hover:bg-rose-50'}`}>🗑 Recently Deleted <span className="float-right text-xs">{trashNotes.length+trashFolders.length}</span></button>
        <p className="mt-5 text-[11px] leading-5 text-neutral-400">Notes save automatically on this device.</p>
      </aside>
      <div className="notes-resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize notes sidebar" onMouseDown={resizeSidebar}><span/></div>
      <div className="min-w-0 notes-main-pane">
        {trashView ? <div className="grid gap-4 xl:grid-cols-[minmax(250px,.8fr)_minmax(0,1.2fr)]"><div className="space-y-3"><h3 className="font-bold">Recently Deleted</h3><p className="text-xs text-neutral-400">Open an item to preview its contents before restoring or deleting it forever.</p>{trashFolders.map(f=><div key={f.id} className={`rounded-xl border p-3 ${trashPreview?.id===f.id?'border-violet-400 bg-violet-50/70':'bg-white/70'}`}><button onClick={()=>openTrashPreview('folder',f.id)} className="w-full truncate text-left text-sm font-semibold">📁 {f.name}</button><div className="mt-2 flex gap-3"><button onClick={()=>restoreFolder(f.id)} className="text-xs font-bold text-violet-600">Restore</button><button onClick={()=>permanentlyDeleteFolder(f.id)} className="text-xs text-rose-500">Delete forever</button></div></div>)}{trashNotes.map(n=><div key={n.id} className={`rounded-xl border p-3 ${trashPreview?.id===n.id?'border-violet-400 bg-violet-50/70':'bg-white/70'}`}><button onClick={()=>openTrashPreview('note',n.id)} className="w-full truncate text-left text-sm font-semibold">📝 {n.title || 'Untitled note'}</button><div className="mt-2 flex gap-3"><button onClick={()=>restoreNote(n.id)} className="text-xs font-bold text-violet-600">Restore</button><button onClick={()=>permanentlyDeleteNote(n.id)} className="text-xs text-rose-500">Delete forever</button></div></div>)}{!trashNotes.length&&!trashFolders.length&&<p className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-400">Trash is empty.</p>}</div><div className="trash-preview min-h-64">{previewNote ? <><div className="mb-2 flex items-center justify-between gap-2"><h4 className="font-bold">📝 {previewNote.title || 'Untitled note'}</h4><span className="text-[10px] text-neutral-400">Preview</span></div><p className="mb-4 text-xs text-neutral-400">Deleted {previewNote.deletedAt ? new Date(previewNote.deletedAt).toLocaleString() : ''}</p><div className="whitespace-pre-wrap break-words text-sm leading-7">{plain(previewNote.bodyHtml || previewNote.body || '') || 'This note is empty.'}</div></> : previewFolder ? <><h4 className="font-bold">📁 {previewFolder.name}</h4><p className="my-2 text-xs text-neutral-400">Folder contents</p><div className="space-y-3">{trashFolders.filter(f=>previewFolderIds.includes(f.id)&&f.id!==previewFolder.id).map(f=><div key={f.id} className="text-sm">📁 {f.name}</div>)}{trashNotes.filter(n=>previewFolderIds.includes(n.folderId)).map(n=><div key={n.id} className="rounded-xl bg-black/[.03] p-3"><div className="text-sm font-bold">📝 {n.title || 'Untitled note'}</div><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-neutral-500">{plain(n.bodyHtml || n.body || '') || 'Empty note'}</p></div>)}{!trashFolders.some(f=>previewFolderIds.includes(f.id)&&f.id!==previewFolder.id)&&!trashNotes.some(n=>previewFolderIds.includes(n.folderId))&&<p className="text-sm text-neutral-400">This folder is empty.</p>}</div></> : <div className="flex h-full min-h-56 items-center justify-center text-center text-sm text-neutral-400">Choose a deleted note or folder to preview its contents.</div>}</div></div> : active ? <div className="notes-editor-card rounded-2xl border border-violet-100 bg-white/65 p-4">
          <div className="mb-3 flex items-center justify-between gap-2"><button onClick={()=>setActiveId(null)} className="text-xs font-semibold text-violet-600">← All notes</button><div className="flex gap-2"><select aria-label="Move note to folder" value={active.folderId} onChange={e=>moveNote(active.id,e.target.value)} className="max-w-32 rounded-lg border bg-white px-2 py-1 text-xs"><option value="inbox">All notes</option>{liveFolders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><button onClick={()=>setShowTags(v=>!v)} className="soft-button rounded-lg px-3 py-1.5 text-xs">🏷 Tags</button><button onClick={()=>trashNote(activeId)} className="rounded-lg px-2 py-1 text-xs text-rose-500">Delete</button></div></div>
          <input value={active.title} onChange={e=>updateNote({title:e.target.value})} placeholder="Note title" className="mb-3 w-full bg-transparent text-xl font-bold outline-none"/>
          <div className="notes-toolbar mb-3"><button title="Bold (Ctrl/Cmd+B)" onMouseDown={e=>e.preventDefault()} onClick={()=>format('bold')} className="toolbar-tool">B</button><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('italic')} className="toolbar-tool italic">I</button><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('strikeThrough')} className="toolbar-tool line-through">S</button><select aria-label="Text size" onChange={e=>format('formatBlock',e.target.value)} defaultValue="p" className="toolbar-tool"><option value="p">Normal</option><option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option></select><span className="toolbar-divider"/><label title="Text color" className="toolbar-tool">A<input type="color" onChange={e=>format('foreColor',e.target.value)} className="h-6 w-6 cursor-pointer"/></label><label title="Highlight color" className="toolbar-tool">▰<input type="color" defaultValue="#FDE68A" onChange={e=>format('hiliteColor',e.target.value)} className="h-6 w-6 cursor-pointer"/></label><span className="toolbar-divider"/><div className="flex gap-1">{TEXT_COLORS.map((c,i)=><button key={c} title={`Text color ${i+1}`} onMouseDown={e=>e.preventDefault()} onClick={()=>format('foreColor',c)} className="h-5 w-5 rounded-full border border-black/10 shadow-sm" style={{backgroundColor:c}}/>)}</div><span className="toolbar-divider"/><div className="flex gap-1">{COLORS.map((c,i)=><button key={c} title={`Highlight ${i+1}`} onMouseDown={e=>e.preventDefault()} onClick={()=>format('hiliteColor',c)} className="h-5 w-5 rounded-lg border border-black/10 shadow-sm" style={{backgroundColor:c}}/>)}</div><span className="toolbar-divider"/><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('insertHorizontalRule')} className="toolbar-tool">― Line</button></div>
          {showTags && <div className="mb-3 flex flex-wrap gap-2">{tags.length ? tags.map(t=><button key={t.id} onClick={()=>toggleTag(t.id)} className={`note-tag-picker-chip rounded-full border px-3 py-1 text-xs font-semibold ${(active.tagIds||[]).includes(t.id)?'is-selected':''}`} style={{background:(active.tagIds||[]).includes(t.id)?t.color:'transparent',borderColor:t.color,color:(active.tagIds||[]).includes(t.id)?'#241b2e':'inherit','--tag-dark':darkShade(t.color)}}>{t.name}</button>) : <span className="text-xs text-neutral-400">Create tags in Timer to use them here.</span>}</div>}
          <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={saveEditor} onKeyDown={keyShortcuts} onBlur={saveEditor} data-placeholder="Start writing…" className="notes-rich-editor min-h-[320px] w-full rounded-xl bg-transparent text-sm leading-7 outline-none" />
          <div className="mt-3 flex flex-wrap gap-2">{(active.tagIds||[]).map(id=>tags.find(t=>t.id===id)).filter(Boolean).map(t=><span key={t.id} className="note-tag-chip rounded-full px-2.5 py-1 text-[11px] font-bold" style={{background:t.color,color:'#241b2e','--tag-dark':darkShade(t.color)}}>{t.name}</span>)}</div>
        </div> : <div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search notes…" className="mb-3 w-full rounded-xl border border-violet-100 bg-white/80 px-3 py-2 text-sm outline-none focus:border-violet-400"/><div className="space-y-2">{visibleNotes.length ? visibleNotes.map((n)=><div key={n.id} className="group flex items-start gap-2 rounded-xl border border-violet-100 bg-white/70 p-3"><span className="mt-0.5 shrink-0 text-base" aria-hidden="true">📄</span><button onClick={()=>setActiveId(n.id)} className="min-w-0 flex-1 text-left"><div className="break-words text-sm font-bold">{n.title || 'Untitled note'}</div><div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-neutral-500">{plain(n.bodyHtml || n.body || '') || 'No additional text'}</div><div className="mt-2 text-[10px] text-neutral-400">{new Date(n.updatedAt).toLocaleString()}</div></button><div className="flex flex-col gap-1 opacity-50 group-hover:opacity-100"><button title="Move up" onClick={()=>shiftOrder('note',n.id,-1)} className="text-xs">↑</button><button title="Move down" onClick={()=>shiftOrder('note',n.id,1)} className="text-xs">↓</button></div></div>) : <div className="rounded-2xl border border-dashed border-violet-200 p-10 text-center"><div className="text-3xl">📝</div><p className="mt-2 text-sm font-semibold">No notes here yet</p><p className="mt-1 text-xs text-neutral-400">Create a note and it will appear here.</p><button onClick={createNote} className="mt-4 rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white">Create your first note</button></div>}</div></div>}
      </div>
    </div>
  </section>
}
