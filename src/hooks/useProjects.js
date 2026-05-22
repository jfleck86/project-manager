// src/hooks/useSupabase.js
//
// Single hook that owns ALL Supabase I/O for PLANR.
// Import it at the top of App.jsx and replace every useState/handler
// that currently lives there with the values this hook returns.
//
// Usage:
//   import { useSupabase } from './hooks/useSupabase'
//   const db = useSupabase(initialPeople, initialProjects)
//   // then use db.projects, db.people, db.addProject, etc.

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Shape: DB row → PLANR state ─────────────────────────────────────────────

function rowToSubtask(r) {
  return {
    id:           r.id,
    title:        r.title,
    status:       r.status,
    priority:     r.priority,
    department:   r.department || '',
    start:        r.start_date || '',
    end:          r.end_date   || '',
    progress:     r.progress   ?? 0,
    dependencies: r.dependencies ?? [],
    assignees:    r.assignees    ?? [],
  }
}

function rowToDeliverable(r, subtaskRows) {
  return {
    id:             r.id,
    title:          r.title,
    status:         r.status,
    priority:       r.priority,
    department:     r.department || '',
    start:          r.start_date || '',
    end:            r.end_date   || '',
    progress:       r.progress   ?? 0,
    dependencies:   r.dependencies ?? [],
    assignees:      r.assignees    ?? [],
    trackOverride:  r.track_override || null,
    subtasks: subtaskRows
      .filter(s => s.deliverable_id === r.id)
      .sort((a, b) => a.position - b.position)
      .map(rowToSubtask),
  }
}

function rowToProject(r, deliverableRows, subtaskRows) {
  return {
    id:         r.id,
    name:       r.name,
    client:     r.client || '',
    color:      r.color,
    archived:   r.archived,
    archivedAt: r.archived_at || null,
    deliverables: deliverableRows
      .filter(d => d.project_id === r.id)
      .sort((a, b) => a.position - b.position)
      .map(d => rowToDeliverable(d, subtaskRows)),
  }
}

// ─── Shape: PLANR state → DB row ─────────────────────────────────────────────

function projectToRow(p, position = 0) {
  return {
    id:       p.id,
    name:     p.name,
    client:   p.client  || '',
    color:    p.color,
    archived: p.archived ?? false,
    archived_at: p.archivedAt || null,
    position,
  }
}

function deliverableToRow(d, projectId, position = 0) {
  return {
    id:             d.id,
    project_id:     projectId,
    title:          d.title,
    status:         d.status,
    priority:       d.priority,
    department:     d.department   || null,
    start_date:     d.start        || null,
    end_date:       d.end          || null,
    progress:       d.progress     ?? 0,
    dependencies:   d.dependencies ?? [],
    assignees:      d.assignees    ?? [],
    track_override: d.trackOverride || null,
    position,
  }
}

function subtaskToRow(s, deliverableId, projectId, position = 0) {
  return {
    id:             s.id,
    deliverable_id: deliverableId,
    project_id:     projectId,
    title:          s.title,
    status:         s.status,
    priority:       s.priority,
    department:     s.department   || null,
    start_date:     s.start        || null,
    end_date:       s.end          || null,
    progress:       s.progress     ?? 0,
    dependencies:   s.dependencies ?? [],
    assignees:      s.assignees    ?? [],
    position,
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSupabase(defaultPeople, defaultProjects) {
  const [projects,         setProjects]         = useState([])
  const [archivedProjects, setArchivedProjects] = useState([])
  const [people,           setPeople]           = useState([])
  const [holidays,         setHolidays]         = useState([])
  const [statusNotes,      setStatusNotes]      = useState({})
  const [savedTemplates,   setSavedTemplates]   = useState([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)

  // Prevent double-seed
  const seeded = useRef(false)

  // ── Load everything from Supabase ────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setError(null)
    try {
      const [
        { data: projRows,   error: e1 },
        { data: delRows,    error: e2 },
        { data: subRows,    error: e3 },
        { data: peopleRows, error: e4 },
        { data: holRows,    error: e5 },
        { data: noteRows,   error: e6 },
        { data: tplRows,    error: e7 },
      ] = await Promise.all([
        supabase.from('projects').select('*').order('position').order('created_at'),
        supabase.from('deliverables').select('*').order('position').order('created_at'),
        supabase.from('subtasks').select('*').order('position').order('created_at'),
        supabase.from('team_members').select('*').order('position').order('created_at'),
        supabase.from('holidays').select('*').order('date'),
        supabase.from('status_notes').select('*'),
        supabase.from('templates').select('*').order('created_at'),
      ])

      const firstErr = [e1,e2,e3,e4,e5,e6,e7].find(Boolean)
      if (firstErr) throw firstErr

      // Seed defaults if DB is empty and we haven't seeded yet
      if (!seeded.current && (!projRows || projRows.length === 0)) {
        seeded.current = true
        await seedDefaults(defaultPeople, defaultProjects)
        return loadAll()
      }
      seeded.current = true

      const active   = (projRows || []).filter(p => !p.archived)
      const archived = (projRows || []).filter(p => p.archived)

      setProjects(active.map(p =>
        rowToProject(p, delRows || [], subRows || [])
      ))
      setArchivedProjects(archived.map(p =>
        rowToProject(p, delRows || [], subRows || [])
      ))
      setPeople((peopleRows || []).map(p => ({
        id: p.id, name: p.name, color: p.color,
      })))
      setHolidays((holRows || []).map(h => ({
        id: h.id, date: h.date, name: h.name,
      })))
      const notes = {}
      ;(noteRows || []).forEach(n => {
        notes[`${n.project_id}::${n.deliverable_id}`] = n.note
      })
      setStatusNotes(notes)
      setSavedTemplates((tplRows || []).map(t => ({
        ...t.data, id: t.id, name: t.name,
      })))
    } catch (err) {
      console.error('[PLANR] loadAll error:', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => { loadAll() }, [loadAll])

  // ── Seed defaults ────────────────────────────────────────────────────────

  async function seedDefaults(people, projects) {
    // Seed people
    if (people?.length) {
      const { error } = await supabase.from('team_members').upsert(
        people.map((p, i) => ({ id: p.id, name: p.name, color: p.color, position: i })),
        { onConflict: 'id' }
      )
      if (error) console.error('[PLANR] seed people:', error)
    }

    // Seed projects, deliverables, subtasks
    for (let pi = 0; pi < (projects || []).length; pi++) {
      const proj = projects[pi]

      const { error: pe } = await supabase.from('projects')
        .upsert(projectToRow(proj, pi), { onConflict: 'id' })
      if (pe) { console.error('[PLANR] seed project:', pe); continue }

      for (let di = 0; di < (proj.deliverables || []).length; di++) {
        const del = proj.deliverables[di]

        const { error: de } = await supabase.from('deliverables')
          .upsert(deliverableToRow(del, proj.id, di), { onConflict: 'id' })
        if (de) { console.error('[PLANR] seed deliverable:', de); continue }

        for (let si = 0; si < (del.subtasks || []).length; si++) {
          const sub = del.subtasks[si]
          const { error: se } = await supabase.from('subtasks')
            .upsert(subtaskToRow(sub, del.id, proj.id, si), { onConflict: 'id' })
          if (se) console.error('[PLANR] seed subtask:', se)
        }
      }
    }
  }

  // ── Helper: optimistic update + DB sync ──────────────────────────────────
  // pattern: setX(optimisticFn) → await dbFn() → if err, reload from DB

  async function optimistic(setFn, dbFn) {
    setFn()
    const error = await dbFn()
    if (error) {
      console.error('[PLANR] write error — reloading:', error)
      loadAll()
    }
  }

  // ── Projects ─────────────────────────────────────────────────────────────

  const addProject = useCallback((proj) => optimistic(
    () => setProjects(ps => [...ps, { ...proj, deliverables: [] }]),
    async () => {
      const pos = (await supabase.from('projects').select('id').order('position')).data?.length ?? 0
      const { error } = await supabase.from('projects').upsert(projectToRow(proj, pos), { onConflict: 'id' })
      return error
    }
  ), [])

  const renameProject = useCallback((id, name, client) => optimistic(
    () => setProjects(ps => ps.map(p => p.id !== id ? p : { ...p, name, client })),
    async () => {
      const { error } = await supabase.from('projects').update({ name, client, updated_at: new Date().toISOString() }).eq('id', id)
      return error
    }
  ), [])

  const archiveProject = useCallback((id) => {
    const proj = projects.find(p => p.id === id)
    if (!proj) return
    const archived_at = new Date().toISOString()
    optimistic(
      () => {
        setProjects(ps => ps.filter(p => p.id !== id))
        setArchivedProjects(a => [...a, { ...proj, archivedAt: archived_at }])
      },
      async () => {
        const { error } = await supabase.from('projects').update({ archived: true, archived_at }).eq('id', id)
        return error
      }
    )
  }, [projects])

  const restoreProject = useCallback((id) => {
    const proj = archivedProjects.find(p => p.id === id)
    if (!proj) return
    const { archivedAt, ...rest } = proj
    optimistic(
      () => {
        setArchivedProjects(a => a.filter(p => p.id !== id))
        setProjects(ps => [...ps, { ...rest, archived: false }])
      },
      async () => {
        const { error } = await supabase.from('projects').update({ archived: false, archived_at: null }).eq('id', id)
        return error
      }
    )
  }, [archivedProjects])

  const deleteProject = useCallback((id) => optimistic(
    () => {
      setProjects(ps => ps.filter(p => p.id !== id))
      setArchivedProjects(a => a.filter(p => p.id !== id))
    },
    async () => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      return error
    }
  ), [])

  // ── Deliverables ─────────────────────────────────────────────────────────

  const addDeliverable = useCallback((projectId, del) => optimistic(
    () => setProjects(ps => ps.map(p =>
      p.id !== projectId ? p : { ...p, deliverables: [...p.deliverables, { ...del, subtasks: del.subtasks || [] }] }
    )),
    async () => {
      const proj = projects.find(p => p.id === projectId)
      const pos  = proj?.deliverables.length ?? 0
      const { error: de } = await supabase.from('deliverables')
        .upsert(deliverableToRow(del, projectId, pos), { onConflict: 'id' })
      if (de) return de
      // Insert any template subtasks
      if (del.subtasks?.length) {
        const { error: se } = await supabase.from('subtasks').upsert(
          del.subtasks.map((s, i) => subtaskToRow(s, del.id, projectId, i)),
          { onConflict: 'id' }
        )
        return se
      }
    }
  ), [projects])

  const deleteDeliverable = useCallback((projectId, deliverableId) => optimistic(
    () => setProjects(ps => ps.map(p =>
      p.id !== projectId ? p : { ...p, deliverables: p.deliverables.filter(d => d.id !== deliverableId) }
    )),
    async () => {
      const { error } = await supabase.from('deliverables').delete().eq('id', deliverableId)
      return error
    }
  ), [])

  // ── Subtasks ─────────────────────────────────────────────────────────────

  const addSubtask = useCallback((projectId, deliverableId, sub) => optimistic(
    () => setProjects(ps => ps.map(p =>
      p.id !== projectId ? p : {
        ...p,
        deliverables: p.deliverables.map(d =>
          d.id !== deliverableId ? d : { ...d, subtasks: [...d.subtasks, sub] }
        ),
      }
    )),
    async () => {
      const del = projects.find(p => p.id === projectId)?.deliverables.find(d => d.id === deliverableId)
      const pos = del?.subtasks.length ?? 0
      const { error } = await supabase.from('subtasks')
        .upsert(subtaskToRow(sub, deliverableId, projectId, pos), { onConflict: 'id' })
      return error
    }
  ), [projects])

  const insertSubtask = useCallback((projectId, deliverableId, afterId, newSub) => optimistic(
    () => setProjects(ps => ps.map(p =>
      p.id !== projectId ? p : {
        ...p,
        deliverables: p.deliverables.map(d => {
          if (d.id !== deliverableId) return d
          const idx = afterId ? d.subtasks.findIndex(s => s.id === afterId) : -1
          const next = [...d.subtasks]
          next.splice(idx + 1, 0, newSub)
          return { ...d, subtasks: next }
        }),
      }
    )),
    async () => {
      // Insert the subtask
      const { error } = await supabase.from('subtasks')
        .upsert(subtaskToRow(newSub, deliverableId, projectId, 0), { onConflict: 'id' })
      if (error) return error
      // Re-index positions in DB
      const del = projects.find(p => p.id === projectId)?.deliverables.find(d => d.id === deliverableId)
      if (!del) return
      const afterIdx = afterId ? del.subtasks.findIndex(s => s.id === afterId) : -1
      const reordered = [...del.subtasks]
      reordered.splice(afterIdx + 1, 0, newSub)
      await syncSubtaskPositions(reordered)
    }
  ), [projects])

  const deleteSubtask = useCallback((projectId, deliverableId, subtaskId) => optimistic(
    () => setProjects(ps => ps.map(p =>
      p.id !== projectId ? p : {
        ...p,
        deliverables: p.deliverables.map(d =>
          d.id !== deliverableId ? d : { ...d, subtasks: d.subtasks.filter(s => s.id !== subtaskId) }
        ),
      }
    )),
    async () => {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId)
      return error
    }
  ), [])

  const reorderSubtasks = useCallback((projectId, deliverableId, newOrder) => optimistic(
    () => setProjects(ps => ps.map(p =>
      p.id !== projectId ? p : {
        ...p,
        deliverables: p.deliverables.map(d =>
          d.id !== deliverableId ? d : { ...d, subtasks: newOrder }
        ),
      }
    )),
    () => syncSubtaskPositions(newOrder)
  ), [])

  async function syncSubtaskPositions(subtasks) {
    const updates = subtasks.map((s, i) =>
      supabase.from('subtasks').update({ position: i }).eq('id', s.id)
    )
    const results = await Promise.all(updates)
    return results.find(r => r.error)?.error ?? null
  }

  // ── Save (edit) any item ─────────────────────────────────────────────────
  // This is the main update path — called from TaskModal "Save Changes"

  const saveItem = useCallback((updated) => optimistic(
    () => setProjects(projs => projs.map(proj => {
      if (proj.id !== updated.projectId) return proj
      return {
        ...proj,
        deliverables: proj.deliverables.map(del => {
          if (del.id === updated.id) return { ...del, ...updated }
          return {
            ...del,
            subtasks: del.subtasks.map(s => s.id === updated.id ? { ...s, ...updated } : s),
          }
        }),
      }
    })),
    async () => {
      if (updated.deliverableId) {
        // It's a subtask
        const del = projects
          .find(p => p.id === updated.projectId)
          ?.deliverables.find(d => d.id === updated.deliverableId)
        const pos = del?.subtasks.findIndex(s => s.id === updated.id) ?? 0
        const { error } = await supabase.from('subtasks').upsert(
          subtaskToRow(updated, updated.deliverableId, updated.projectId, pos),
          { onConflict: 'id' }
        )
        return error
      } else {
        // It's a deliverable
        const proj = projects.find(p => p.id === updated.projectId)
        const pos  = proj?.deliverables.findIndex(d => d.id === updated.id) ?? 0
        const { error } = await supabase.from('deliverables').upsert(
          deliverableToRow(updated, updated.projectId, pos),
          { onConflict: 'id' }
        )
        return error
      }
    }
  ), [projects])

  // ── Mark done (one-click check) ──────────────────────────────────────────

  const markDone = useCallback((projectId, deliverableId, subtaskId) => {
    const proj = projects.find(p => p.id === projectId)
    const del  = proj?.deliverables.find(d => d.id === deliverableId)

    if (subtaskId) {
      const sub     = del?.subtasks.find(s => s.id === subtaskId)
      const next    = sub?.status === 'Done' ? 'In Progress' : 'Done'
      const newProg = next === 'Done' ? 100 : 0

      optimistic(
        () => setProjects(ps => ps.map(p =>
          p.id !== projectId ? p : {
            ...p,
            deliverables: p.deliverables.map(d =>
              d.id !== deliverableId ? d : {
                ...d,
                subtasks: d.subtasks.map(s =>
                  s.id !== subtaskId ? s : { ...s, status: next, progress: newProg }
                ),
              }
            ),
          }
        )),
        async () => {
          const { error } = await supabase.from('subtasks')
            .update({ status: next, progress: newProg, updated_at: new Date().toISOString() })
            .eq('id', subtaskId)
          return error
        }
      )
    } else {
      const next    = del?.status === 'Done' ? 'In Progress' : 'Done'
      const newProg = next === 'Done' ? 100 : del?.progress ?? 0

      optimistic(
        () => setProjects(ps => ps.map(p =>
          p.id !== projectId ? p : {
            ...p,
            deliverables: p.deliverables.map(d =>
              d.id !== deliverableId ? d : {
                ...d,
                status: next,
                progress: newProg,
                subtasks: next === 'Done'
                  ? d.subtasks.map(s => ({ ...s, status: 'Done', progress: 100 }))
                  : d.subtasks,
              }
            ),
          }
        )),
        async () => {
          const { error: de } = await supabase.from('deliverables')
            .update({ status: next, progress: newProg, updated_at: new Date().toISOString() })
            .eq('id', deliverableId)
          if (de) return de
          if (next === 'Done') {
            const { error: se } = await supabase.from('subtasks')
              .update({ status: 'Done', progress: 100, updated_at: new Date().toISOString() })
              .eq('deliverable_id', deliverableId)
            return se
          }
        }
      )
    }
  }, [projects])

  // ── Team members ─────────────────────────────────────────────────────────

  const savePeople = useCallback((newPeople) => optimistic(
    () => setPeople(newPeople),
    async () => {
      // Upsert all
      const { error: ue } = await supabase.from('team_members').upsert(
        newPeople.map((p, i) => ({ id: p.id, name: p.name, color: p.color, position: i })),
        { onConflict: 'id' }
      )
      if (ue) return ue
      // Delete removed members
      const ids = newPeople.map(p => p.id)
      const { data: existing } = await supabase.from('team_members').select('id')
      const toDelete = (existing || []).filter(r => !ids.includes(r.id)).map(r => r.id)
      if (toDelete.length) {
        const { error: de } = await supabase.from('team_members').delete().in('id', toDelete)
        return de
      }
    }
  ), [])

  // ── Holidays ─────────────────────────────────────────────────────────────

  const saveHolidays = useCallback((newHolidays) => optimistic(
    () => setHolidays(newHolidays),
    async () => {
      // Delete all then re-insert (holidays list is small)
      await supabase.from('holidays').delete().neq('id', '00000000')
      if (!newHolidays.length) return null
      const { error } = await supabase.from('holidays').insert(
        newHolidays.map(h => ({ date: h.date, name: h.name }))
      )
      return error
    }
  ), [])

  // ── Status notes ─────────────────────────────────────────────────────────

  const updateNote = useCallback((key, text) => {
    const [projectId, deliverableId] = key.split('::')
    optimistic(
      () => setStatusNotes(n => ({ ...n, [key]: text })),
      async () => {
        const { error } = await supabase.from('status_notes').upsert(
          { project_id: projectId, deliverable_id: deliverableId, note: text, updated_at: new Date().toISOString() },
          { onConflict: 'project_id,deliverable_id' }
        )
        return error
      }
    )
  }, [])

  // ── Templates ────────────────────────────────────────────────────────────

  const saveTemplate = useCallback((template) => optimistic(
    () => setSavedTemplates(ts => [...ts, template]),
    async () => {
      const { error } = await supabase.from('templates').upsert(
        { id: template.id, name: template.name, color: template.color || null, data: template },
        { onConflict: 'id' }
      )
      return error
    }
  ), [])

  // ─────────────────────────────────────────────────────────────────────────

  return {
    // State (read-only from the hook's perspective)
    projects,
    archivedProjects,
    people,
    holidays,
    statusNotes,
    savedTemplates,
    loading,
    error,

    // Actions
    addProject,
    renameProject,
    archiveProject,
    restoreProject,
    deleteProject,

    addDeliverable,
    deleteDeliverable,

    addSubtask,
    insertSubtask,
    deleteSubtask,
    reorderSubtasks,

    saveItem,
    markDone,

    savePeople,
    saveHolidays,
    updateNote,
    saveTemplate,

    reload: loadAll,
  }
}