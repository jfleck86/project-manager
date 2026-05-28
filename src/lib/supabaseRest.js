// Supabase REST client — thin fetch wrapper, no SDK needed

function makeClient(url, key) {
  const base = `${url}/rest/v1`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  return {
    async select(table, query = "") {
      const res = await fetch(`${base}/${table}?${query}`, { headers });
      const data = await res.json();
      return res.ok ? { data, error: null } : { data: null, error: data };
    },
    async upsert(table, row) {
      const res = await fetch(`${base}/${table}`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(row),
      });
      const data = await res.json();
      return res.ok ? { data, error: null } : { data: null, error: data };
    },
    async update(table, id, patch) {
      const res = await fetch(`${base}/${table}?id=eq.${id}`, {
        method: "PATCH", headers, body: JSON.stringify(patch),
      });
      const data = await res.json();
      return res.ok ? { data, error: null } : { data: null, error: data };
    },
    async delete(table, id) {
      const res = await fetch(`${base}/${table}?id=eq.${id}`, { method: "DELETE", headers });
      if (!res.ok) { const data = await res.json().catch(() => ({})); return { error: data }; }
      return { error: null };
    },
    async reorder(table, rows) {
      await Promise.all(rows.map((r, i) =>
        fetch(`${base}/${table}?id=eq.${r.id}`, {
          method: "PATCH", headers, body: JSON.stringify({ position: i }),
        })
      ));
    },
  };
}

export function createSupabaseClient(url, key) {
  return makeClient(url, key);
}

// Check if Supabase is configured (set by main.jsx before React mounts)
export const isSBReady = () =>
  typeof window !== "undefined" && !!window.__SB_URL__ && !!window.__SB_KEY__;