// src/layouts/UserLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';

export default function UserLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex flex-col font-sans text-slate-800 overflow-x-hidden">
      {/* === Contenu Principal === */}
      <main className="w-full flex-grow overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}