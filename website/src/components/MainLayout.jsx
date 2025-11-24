import React from 'react';
import Sidebar from './Sidebar';

/*
 * NOTE: C'est un pur composant de layout.
 * - Il crée simplement la grille Sidebar + Contenu.
 */
export default function MainLayout({ children, userName, activeTab, setActiveTab, onSettingsClick }) {
  return (
    /* * Cette grille est placée à l'intérieur de la balise <main> de App.jsx
     * et s'adapte aux écrans mobiles (lg:grid-cols-12)
    */
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">

      {/* --- Sidebar (colonne de gauche) --- */}
      <div className="lg:col-span-3 h-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userName={userName}
          onSettingsClick={onSettingsClick}
        />
      </div>

      {/* --- Contenu Principal (colonne de droite) --- */}
      <div className="lg:col-span-9">
        {/* La boîte blanche qui encapsule l'onglet actif */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sm:p-8 w-full min-h-[75vh]">
          {children}
        </div>
      </div>
    </div>
  );
}