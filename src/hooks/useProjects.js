// src/hooks/useProjects.js
// Handles all Supabase reads and writes for PLANR.
// Drop this file into src/hooks/ and import { useProjects } in App.jsx

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Shape helpers ────────────────────────────────────────────────────────────
// Convert flat Supabase rows → nested { projects: [...] } that PLANR expects

function dbRowToDeliverable(row, subtasks = []) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    department: row.department || '',
    start: row.start_date,
    end: row.end_date,
    progress: row.progress ?? 0,
    dependencies: row.dependencies ?? [],
    assignees: row.assignees ?? [],
    subtasks: subtasks
      .filter(s => s.deliverable_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map(dbRowToSubtask),
  };
}

function dbRowToSubtask(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    department: row.department || '',
    start: row.start_date,
    end: row.end_date,
    progress: row.progress ?? 0,
    dependencies: row.dependencies ?? [],
    assignees: row.assignees ?? [],
  };
}

function dbRowToProject(row, deliverables = [], subtasks = []) {
  return {
    id: row.id,
    name: row.name,
    client: row.client || '',
    color: row.color,
    deliverables: deliverables
      .filter(d => d.project_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map(d => dbRowToDeliverable(d, subtasks)),
  };
}

// Convert PLANR state → flat Supabase row for upsert
function projectToDb(proj) {
  return { id: proj.id, name: proj.name, client: proj.client || '', color: proj.color, archived: false };
}

function deliverableToDb(del, projectId, position = 0) {
  return {
    id: del.id,
    project_id: projectId,
    title: del.title,
    status: del.status,
    priority: del.priority,
    department: del.department || null,
    start_date: del.start || null,
    end_date: del.end || null,
    progress: del.progress ?? 0,
    dependencies: del.dependencies ?? [],
    assignees: del.assignees ?? [],
    position,
  };
}

function subtaskToDb(sub, deliverableId, projectId, position = 0) {
  return {
    id: sub.id,
    deliverable_id: deliverableId,
    project_id: projectId,
    title: sub.title,
    status: sub.status,
    priority: sub.priority,
    department: sub.department || null,
    start_date: sub.start || null,
    end_date: sub.end || null,
    progress: sub.progress ?? 0,
    dependencies: sub.dependencies ?? [],
    assignees: sub.assignees ?? [],
    position,
  };
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useProjects() {
  const [projects, setProjects]               = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [people, setPeople]                   = useState([]);
  const [holidays, setHolidays]               = useState([]);
  const [statusNotes, setStatusNotes]         = useState({});
  const [savedTemplates, setSavedTemplates]   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: projRows,  error: e1 },
        { data: delRows,   error: e2 },
        { data: subRows,   error: e3 },
        { data: peopleRows,error: e4 },
        { data: holRows,   error: e5 },
        { data: noteRows,  error: e6 },
        { data: tplRows,   error: e7 },
      ] = await Promise.all([
        supabase.from('projects').select('*').order('created_at'),
        supabase.from('deliverables').select('*').order('position'),
        supabase.from('subtasks').select('*').order('position'),
        supabase.from('team_members').select('*').order('position'),
        supabase.from('holidays').select('*').order('date'),
        supabase.from('status_notes').select('*'),
        supabase.from('templates').select('*').order('created_at'),
      ]);

      for (const err of [e1, e2, e3, e4, e5, e6, e7]) {
        if (err) throw err;
      }

      const active   = (projRows || []).filter(p => !p.archived);
      const archived = (projRows || []).filter(p => p.archived);

      setProjects(active.map(p => dbRowToProject(p, delRows || [], subRows || [])));
      setArchivedProjects(archived.map(p => dbRowToProject(p, delRows || [], subRows || [])));

      setPeople((peopleRows || []).map(p => ({ id: p.id, name: p.name, color: p.color })));
      setHolidays((holRows || []).map(h => ({ id: h.id, date: h.date, name: h.name })));
      setSavedTemplates((tplRows || []).map(t => ({ ...t.data, id: t.id, name: t.name })));

      const notes = {};
      (noteRows || []).forEach(n => { notes[`${n.project_id}::${n.deliverable_id}`] = n.note; });
      setStatusNotes(notes);
    } catch (err) {
      console.error('PLANR load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Projects ────────────────────────────────────────────────────────────────
  const addProject = useCallback(async (proj) => {
    setProjects(ps => [...ps, { ...proj, deliverables: [] }]);
    const { error } = await supabase.from('projects').upsert(projectToDb(proj));
    if (error) { console.error('addProject:', error); loadAll(); }
  }, []);

  const renameProject = useCallback(async (id, name, client) => {
    setProjects(ps => ps.map(p => p.id !== id ? p : { ...p, name, client }));
    const { error } = await supabase.from('projects').update({ name, client }).eq('id', id);
    if (error) { console.error('renameProject:', error); loadAll(); }
  }, []);

  const archiveProject = useCallback(async (id) => {
    const proj = projects.find(p => p.id === id);
    if (!proj) return;
    setProjects(ps => ps.filter(p => p.id !== id));
    setArchivedProjects(a => [...a, { ...proj, archivedAt: new Date().toISOString() }]);
    const { error } = await supabase.from('projects').update({ archived: true, archived_at: new Date().toISOString() }).eq('id', id);
    if (error) { console.error('archiveProject:', error); loadAll(); }
  }, [projects]);

  const restoreProject = useCallback(async (id) => {
    const proj = archivedProjects.find(p => p.id === id);
    if (!proj) return;
    const { archivedAt, ...rest } = proj;
    setArchivedProjects(a => a.filter(p => p.id !== id));
    setProjects(ps => [...ps, rest]);
    const { error } = await supabase.from('projects').update({ archived: false, archived_at: null }).eq('id', id);
    if (error) { console.error('restoreProject:', error); loadAll(); }
  }, [archivedProjects]);

  const deleteProject = useCallback(async (id) => {
    setProjects(ps => ps.filter(p => p.id !== id));
    setArchivedProjects(a => a.filter(p => p.id !== id));
    // Cascade deletes deliverables + subtasks via FK
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { console.error('deleteProject:', error); loadAll(); }
  }, []);

  // ── Deliverables ────────────────────────────────────────────────────────────
  const addDeliverable = useCallback(async (projectId, del) => {
    setProjects(ps => ps.map(p => p.id !== projectId ? p : { ...p, deliverables: [...p.deliverables, del] }));
    const position = projects.find(p => p.id === projectId)?.deliverables.length ?? 0;
    const row = deliverableToDb(del, projectId, position);
    const { error } = await supabase.from('deliverables').upsert(row);
    if (error) { console.error('addDeliverable:', error); loadAll(); }

    // Insert subtasks from template if any
    if (del.subtasks?.length > 0) {
      const subRows = del.subtasks.map((s, i) => subtaskToDb(s, del.id, projectId, i));
      const { error: se } = await supabase.from('subtasks').upsert(subRows);
      if (se) { console.error('addDeliverable subtasks:', se); loadAll(); }
    }
  }, [projects]);

  const saveItem = useCallback(async (updated) => {
    // Optimistic update
    setProjects(projs => projs.map(proj => {
      if (proj.id !== updated.projectId) return proj;
      return {
        ...proj,
        deliverables: proj.deliverables.map(del => {
          if (del.id === updated.id) return { ...del, ...updated };
          return { ...del, subtasks: del.subtasks.map(s => s.id === updated.id ? { ...s, ...updated } : s) };
        }),
      };
    }));

    if (updated.deliverableId) {
      // It's a subtask
      const { error } = await supabase.from('subtasks').upsert(subtaskToDb(updated, updated.deliverableId, updated.projectId));
      if (error) { console.error('saveSubtask:', error); loadAll(); }
    } else {
      // It's a deliverable
      const position = projects.find(p => p.id === updated.projectId)?.deliverables.findIndex(d => d.id === updated.id) ?? 0;
      const { error } = await supabase.from('deliverables').upsert(deliverableToDb(updated, updated.projectId, position));
      if (error) { console.error('saveDeliverable:', error); loadAll(); }
    }
  }, [projects]);

  const addSubtask = useCallback(async (projectId, deliverableId, sub) => {
    setProjects(ps => ps.map(p => p.id !== projectId ? p : {
      ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: [...d.subtasks, sub] }),
    }));
    const del = projects.find(p => p.id === projectId)?.deliverables.find(d => d.id === deliverableId);
    const position = del?.subtasks.length ?? 0;
    const { error } = await supabase.from('subtasks').upsert(subtaskToDb(sub, deliverableId, projectId, position));
    if (error) { console.error('addSubtask:', error); loadAll(); }
  }, [projects]);

  const insertSubtask = useCallback(async (projectId, deliverableId, afterId, newSub) => {
    setProjects(ps => ps.map(p => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map(d => {
        if (d.id !== deliverableId) return d;
        const idx = afterId ? d.subtasks.findIndex(s => s.id === afterId) : -1;
        const updated = [...d.subtasks];
        updated.splice(idx + 1, 0, newSub);
        return { ...d, subtasks: updated };
      }),
    }));
    // Upsert new subtask then fix positions
    const { error } = await supabase.from('subtasks').upsert(subtaskToDb(newSub, deliverableId, projectId, 0));
    if (error) { console.error('insertSubtask:', error); }
    // Reload to fix positions
    loadAll();
  }, []);

  const reorderSubtasks = useCallback(async (projectId, deliverableId, newOrder) => {
    setProjects(ps => ps.map(p => p.id !== projectId ? p : {
      ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: newOrder }),
    }));
    // Update positions in DB
    const updates = newOrder.map((s, i) =>
      supabase.from('subtasks').update({ position: i }).eq('id', s.id)
    );
    await Promise.all(updates);
  }, []);

  const deleteDeliverable = useCallback(async (projectId, deliverableId) => {
    setProjects(ps => ps.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.filter(d => d.id !== deliverableId) }));
    const { error } = await supabase.from('deliverables').delete().eq('id', deliverableId);
    if (error) { console.error('deleteDeliverable:', error); loadAll(); }
  }, []);

  const deleteSubtask = useCallback(async (projectId, deliverableId, subtaskId) => {
    setProjects(ps => ps.map(p => p.id !== projectId ? p : {
      ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: d.subtasks.filter(s => s.id !== subtaskId) }),
    }));
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
    if (error) { console.error('deleteSubtask:', error); loadAll(); }
  }, []);

  const markDone = useCallback(async (projectId, deliverableId, subtaskId) => {
    setProjects(projs => projs.map(proj => {
      if (proj.id !== projectId) return proj;
      return {
        ...proj,
        deliverables: proj.deliverables.map(del => {
          if (subtaskId) {
            if (del.id !== deliverableId) return del;
            return { ...del, subtasks: del.subtasks.map(s => s.id !== subtaskId ? s : { ...s, status: s.status === 'Done' ? 'In Progress' : 'Done', progress: s.status === 'Done' ? 0 : 100 }) };
          } else {
            if (del.id !== deliverableId) return del;
            const next = del.status === 'Done' ? 'In Progress' : 'Done';
            return { ...del, status: next, progress: next === 'Done' ? 100 : del.progress, subtasks: next === 'Done' ? del.subtasks.map(s => ({ ...s, status: 'Done', progress: 100 })) : del.subtasks };
          }
        }),
      };
    }));

    if (subtaskId) {
      const proj = projects.find(p => p.id === projectId);
      const del = proj?.deliverables.find(d => d.id === deliverableId);
      const sub = del?.subtasks.find(s => s.id === subtaskId);
      if (sub) {
        const nextStatus = sub.status === 'Done' ? 'In Progress' : 'Done';
        await supabase.from('subtasks').update({ status: nextStatus, progress: nextStatus === 'Done' ? 100 : 0 }).eq('id', subtaskId);
      }
    } else {
      const del = projects.find(p => p.id === projectId)?.deliverables.find(d => d.id === deliverableId);
      if (del) {
        const next = del.status === 'Done' ? 'In Progress' : 'Done';
        await supabase.from('deliverables').update({ status: next, progress: next === 'Done' ? 100 : del.progress }).eq('id', deliverableId);
        if (next === 'Done') {
          await supabase.from('subtasks').update({ status: 'Done', progress: 100 }).eq('deliverable_id', deliverableId);
        }
      }
    }
  }, [projects]);

  // ── Team members ────────────────────────────────────────────────────────────
  const savePeople = useCallback(async (newPeople) => {
    setPeople(newPeople);
    // Upsert all, then delete removed ones
    const { error } = await supabase.from('team_members').upsert(
      newPeople.map((p, i) => ({ id: p.id, name: p.name, color: p.color, position: i }))
    );
    if (error) console.error('savePeople:', error);
  }, []);

  // ── Holidays ────────────────────────────────────────────────────────────────
  const saveHolidays = useCallback(async (newHolidays) => {
    setHolidays(newHolidays);
    await supabase.from('holidays').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (newHolidays.length > 0) {
      const { error } = await supabase.from('holidays').insert(newHolidays.map(h => ({ date: h.date, name: h.name })));
      if (error) console.error('saveHolidays:', error);
    }
  }, []);

  // ── Status notes ────────────────────────────────────────────────────────────
  const updateNote = useCallback(async (key, text) => {
    setStatusNotes(n => ({ ...n, [key]: text }));
    const [projectId, deliverableId] = key.split('::');
    const { error } = await supabase.from('status_notes').upsert(
      { project_id: projectId, deliverable_id: deliverableId, note: text, updated_at: new Date().toISOString() },
      { onConflict: 'project_id,deliverable_id' }
    );
    if (error) console.error('updateNote:', error);
  }, []);

  // ── Templates ────────────────────────────────────────────────────────────────
  const saveTemplate = useCallback(async (template) => {
    setSavedTemplates(ts => [...ts, template]);
    const { error } = await supabase.from('templates').insert({ id: template.id, name: template.name, color: template.color, data: template });
    if (error) console.error('saveTemplate:', error);
  }, []);

  return {
    // State
    projects, archivedProjects, people, holidays, statusNotes, savedTemplates, loading, error,
    // Project actions
    addProject, renameProject, archiveProject, restoreProject, deleteProject,
    // Deliverable actions
    addDeliverable, saveItem, deleteDeliverable,
    // Subtask actions
    addSubtask, insertSubtask, reorderSubtasks, deleteSubtask, markDone,
    // Other
    savePeople, saveHolidays, updateNote, saveTemplate,
    reload: loadAll,
  };
}