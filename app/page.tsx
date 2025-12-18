'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Users, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          groupCode: mode === 'join' ? groupCode : undefined,
          action: mode,
          // Calibration would typically be passed here for 'create' mode
          // allowing the creator to set the map. For MVP we use defaults/hardcoded in store.
          calibration: mode === 'create' ? {
            p1: { gps: { lat: -34.603722, lng: -58.381592 }, map: { x: 100, y: 100 } }, // Obelisco Buenos Aires (Example)
            p2: { gps: { lat: -34.604722, lng: -58.382592 }, map: { x: 500, y: 500 } },
            scale: 1
          } : undefined
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join group');
      }

      // Store in localStorage for persistence across reloads
      // In a real app, use a proper Auth Context
      localStorage.setItem('venue_tracker_user', JSON.stringify({
        userId: data.user.id,
        name: data.user.name,
        groupCode: data.group.id
      }));

      // Redirect to map
      router.push(`/map?code=${data.group.id}&uid=${data.user.id}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <MapPin className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Venue Tracker</h1>
          <p className="text-slate-400">Localización en tiempo real para eventos</p>
        </div>

        <div className="flex bg-slate-700 p-1 rounded-lg mb-6">
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'join' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
          >
            Unirse
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'create' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
          >
            Crear Grupo
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tu Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Ej: Juan Perez"
            />
          </div>

          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Código del Grupo</label>
              <input
                type="text"
                required
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono tracking-widest uppercase"
                placeholder="ABCD"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'join' ? 'Entrar al Mapa' : 'Crear y Entrar'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
