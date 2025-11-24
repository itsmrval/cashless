// src/pages/admin/AdminCardManagement.jsx
import React from 'react';

export default function AdminCardManagement() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Gestion des Cartes</h1>
      <p>Ici, vous pourrez créer des cartes, les assigner à des utilisateurs et changer leur statut (active, blocked, etc.).</p>
      {/* Implémentez un tableau avec les appels API (api.getAllCards, api.createCard, api.updateCardStatus, ...) */}
    </div>
  );
}