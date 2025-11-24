import React, { useState, useEffect } from 'react';

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = localStorage.getItem('api_url') || 'http://localhost:3000';

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/user`);
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError('Erreur chargement utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/v1/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Erreur création utilisateur');
      setForm({ name: '', username: '', password: '' });
      fetchUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/v1/user/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch {
      setError('Erreur suppression utilisateur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-blue-700">Créer un utilisateur</h2>
      <form className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 bg-blue-50 p-6 rounded-lg shadow" onSubmit={handleSubmit}>
        <input type="text" id="name" value={form.name} onChange={handleChange} placeholder="Nom" required className="px-4 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 transition" />
        <input type="text" id="username" value={form.username} onChange={handleChange} placeholder="Nom d'utilisateur" required className="px-4 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 transition" />
        <input type="password" id="password" value={form.password} onChange={handleChange} placeholder="Mot de passe" required className="px-4 py-2 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500 transition" />
        <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-6 py-2 rounded shadow hover:scale-105 transition">Créer</button>
      </form>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded shadow">{error}</div>}
      <h3 className="text-lg font-semibold mb-4 text-gray-700">Liste des utilisateurs</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-lg shadow">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-3 text-left text-xs font-bold text-blue-700">ID</th>
              <th className="p-3 text-left text-xs font-bold text-blue-700">Nom</th>
              <th className="p-3 text-left text-xs font-bold text-blue-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id} className="border-t hover:bg-blue-50">
                <td className="p-3 font-mono text-xs text-gray-500">{user._id}</td>
                <td className="p-3">{user.name}</td>
                <td className="p-3">
                  <button className="bg-red-500 hover:bg-red-700 text-white px-4 py-1 rounded shadow transition" onClick={() => handleDelete(user._id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UsersTab;
