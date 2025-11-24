import React, { useState, useEffect } from 'react';

function CardsTab() {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ comment: '', puk: '' });
  const [assignForm, setAssignForm] = useState({ cardId: '', userId: '' });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = localStorage.getItem('api_url') || 'http://localhost:3000';

  const fetchCards = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/card`);
      const data = await res.json();
      setCards(data);
    } catch (e) {
      setError('Erreur chargement cartes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/v1/user`);
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchCards();
    fetchUsers();
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleAssignChange = e => {
    setAssignForm({ ...assignForm, [e.target.id]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/v1/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Erreur création carte');
      setForm({ comment: '', puk: '' });
      setSuccess('Carte créée !');
      fetchCards();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/v1/card/${assignForm.cardId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: assignForm.userId })
      });
      if (!res.ok) throw new Error('Erreur assignation');
      setAssignForm({ cardId: '', userId: '' });
      setSuccess('Carte assignée !');
      fetchCards();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer cette carte ?')) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/v1/card/${id}`, { method: 'DELETE' });
      fetchCards();
    } catch {
      setError('Erreur suppression carte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-blue-700">Créer une carte</h2>
      <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-blue-50 p-6 rounded-lg shadow" onSubmit={handleSubmit}>
        <input type="text" id="comment" value={form.comment} onChange={handleChange} placeholder="Commentaire (optionnel)" className="px-4 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 transition" />
        <input type="text" id="puk" value={form.puk} onChange={handleChange} placeholder="Code PUK" required className="px-4 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 transition" />
        <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-6 py-2 rounded shadow hover:scale-105 transition">Créer</button>
      </form>
      <h2 className="text-xl font-bold mb-4 text-blue-700">Assigner une carte à un utilisateur</h2>
      <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 bg-blue-50 p-6 rounded-lg shadow" onSubmit={handleAssign}>
        <select id="cardId" value={assignForm.cardId} onChange={handleAssignChange} required className="px-4 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 transition">
          <option value="">Sélectionner une carte</option>
          {cards.filter(card => !card.user_id).map(card => (
            <option key={card._id} value={card._id}>{card._id} {card.comment ? `- ${card.comment}` : ''}</option>
          ))}
        </select>
        <select id="userId" value={assignForm.userId} onChange={handleAssignChange} required className="px-4 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 transition">
          <option value="">Sélectionner un utilisateur</option>
          {users.map(user => (
            <option key={user._id} value={user._id}>{user.name}</option>
          ))}
        </select>
        <button type="submit" className="bg-gradient-to-r from-green-600 to-green-400 text-white px-6 py-2 rounded shadow hover:scale-105 transition">Assigner</button>
      </form>
      {(error || success) && <div className={`p-2 mb-4 rounded shadow ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{error || success}</div>}
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Liste des cartes</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-lg shadow">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-3 text-left text-xs font-bold text-blue-700">Card ID</th>
              <th className="p-3 text-left text-xs font-bold text-blue-700">Commentaire</th>
              <th className="p-3 text-left text-xs font-bold text-blue-700">Status</th>
              <th className="p-3 text-left text-xs font-bold text-blue-700">User assigné</th>
              <th className="p-3 text-left text-xs font-bold text-blue-700">PUK</th>
              <th className="p-3 text-left text-xs font-bold text-blue-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(card => (
              <tr key={card._id} className="border-t hover:bg-blue-50">
                <td className="p-3 font-mono text-xs text-gray-500">{card._id}</td>
                <td className="p-3">{card.comment || '-'}</td>
                <td className="p-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${card.status === 'active' ? 'bg-green-100 text-green-800' : card.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{card.status}</span>
                </td>
                <td className="p-3">{card.user_id ? card.user_id.name : '-'}</td>
                <td className="p-3 font-mono text-xs text-gray-500">{card.puk || '-'}</td>
                <td className="p-3">
                  <button className="bg-red-500 hover:bg-red-700 text-white px-4 py-1 rounded shadow transition" onClick={() => handleDelete(card._id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CardsTab;
