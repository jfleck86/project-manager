// src/main.jsx
// This is the ONLY file in the project that uses import.meta.env.
// It reads the Supabase credentials and puts them on window BEFORE
// the React app mounts, so App.jsx can read them without using import.meta.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import App from './App.jsx'
import ProofApp from './proof/ProofApp.jsx'

// Set Supabase config on window before App renders.
window.__SB_URL__ = import.meta.env.VITE_SUPABASE_URL || "";
window.__SB_KEY__ = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

console.log("[PLANR] main.jsx — SB_URL:", window.__SB_URL__ ? window.__SB_URL__.slice(0, 40) + "..." : "NOT SET — check .env.local");
console.log("[PLANR] main.jsx — SB_KEY:", window.__SB_KEY__ ? window.__SB_KEY__.slice(0, 8) + "..." : "NOT SET — check .env.local");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/proof/*" element={<ProofApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)