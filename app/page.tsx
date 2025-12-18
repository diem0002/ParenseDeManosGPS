'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lastSession, setLastSession] = useState<{ userId: string, name: string, groupCode: string } | null>(null);

  useState(() => {
    // Check local storage on mount (lazy init)
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('venue_tracker_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.groupCode) {
            setLastSession(parsed);
            // Pre-fill
            setName(parsed.name || '');
            setGroupCode(parsed.groupCode || '');
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent, isRejoin: boolean = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const targetCode = isRejoin ? lastSession?.groupCode : (mode === 'join' ? groupCode : undefined);
    const targetName = isRejoin ? lastSession?.name : name;

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetName,
          groupCode: targetCode,
          action: isRejoin ? 'create' : mode, // Trick: Rejoin tries to CREATE with old ID to resurrect it
          calibration: (mode === 'create' || isRejoin) ? {
            p1: { gps: { lat: -34.643494, lng: -58.396511 }, map: { x: 500, y: 500 } },
            p2: { gps: { lat: -34.644494, lng: -58.396511 }, map: { x: 500, y: 900 } },
            scale: 1
          } : undefined
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join group');
      }

      localStorage.setItem('venue_tracker_user', JSON.stringify({
        userId: data.user.id,
        name: data.user.name,
        groupCode: data.group.id
      }));

      router.push(`/map?code=${data.group.id}&uid=${data.user.id}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-bg.png"
          alt="Background"
          fill
          className="object-cover opacity-40 blur-sm"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-brand-red/20" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="w-64 h-32 relative mb-4">
            <Image
              src="/logo.png"
              alt="Parense de Manos"
              fill
              className="object-contain drop-shadow-[0_0_15px_rgba(213,0,0,0.6)]"
            />
          </div>
          <div className="inline-flex items-center space-x-2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse shadow-[0_0_8px_#ff1744]" />
            <p className="text-gray-300 text-xs font-mono uppercase tracking-widest">Live Tracker</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl shadow-brand-red/10">

          {/* Tabs */}
          <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${mode === 'join'
                ? 'bg-brand-red text-white shadow-[0_0_20px_rgba(213,0,0,0.4)]'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
            >
              Unirse
            </button>
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${mode === 'create'
                ? 'bg-brand-red text-white shadow-[0_0_20px_rgba(213,0,0,0.4)]'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
            >
              Crear Grupo
            </button>
          </div>

          {/* Rejoin Session Banner */}
          {lastSession && !loading && (
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl relative animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Sesión Previa Detectada</span>
                <button onClick={() => { localStorage.removeItem('venue_tracker_user'); setLastSession(null); }} className="text-xs text-gray-500 hover:text-white"><ArrowRight className="w-3 h-3 rotate-180" /></button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm uppercase">{lastSession.name}</p>
                  <p className="text-brand-red font-mono text-xs">CODE: {lastSession.groupCode}</p>
                </div>
                <button
                  onClick={(e) => handleSubmit(e, true)}
                  className="bg-brand-red hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider"
                >
                  Reconectar
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tu Nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red/50 outline-none transition-all"
                placeholder="Ej: Gero Arias"
              />
            </div>

            {mode === 'join' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Código de Grupo</label>
                <input
                  type="text"
                  required
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red/50 outline-none transition-all font-mono text-lg tracking-[0.2em] uppercase text-center"
                  placeholder="CODE"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-red to-red-700 hover:from-red-600 hover:to-red-800 text-white font-black uppercase italic tracking-wider py-4 rounded-xl shadow-[0_4px_30px_rgba(213,0,0,0.3)] transition-all transform hover:scale-[1.02] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group border border-white/10"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'join' ? 'Ingresar al Ring' : 'Crear Sala'}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-[10px] mt-6 font-mono">
          PARENSE DE MANOS III &copy; 2024
        </p>
      </div>
    </main>
  );
}
