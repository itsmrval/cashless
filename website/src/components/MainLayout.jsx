import React from 'react';
import Sidebar from './Sidebar';

/*
 * NOTE: C'est un pur composant de layout.
 * - Il crée simplement la grille Sidebar + Contenu.
 * - Responsive: sidebar cachée sur mobile avec header + drawer
 */
export default function MainLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* --- Sidebar (fixe à gauche sur desktop, drawer sur mobile) --- */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* --- Contenu Principal --- */}
      {/* Sur mobile: padding-top pour le header mobile */}
      {/* Sur desktop: margin-left pour la sidebar fixe */}
      <div className="flex-1 lg:ml-72 pt-20 lg:pt-6 p-4 sm:p-6 min-w-0 overflow-x-hidden">
        {/* La boîte blanche qui encapsule l'onglet actif */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6 lg:p-8 w-full min-h-[75vh] overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}