'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Group, User } from '@/lib/types';
import { haversineDistance } from '@/lib/geometry';
import { VenueMap } from '@/components/VenueMap';
import { LocationManager } from '@/components/LocationManager';
import { Users, Navigation, AlertTriangle, Calendar, X } from 'lucide-react';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

function MapContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const groupCode = searchParams.get('code');
    const userId = searchParams.get('uid');

    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [error, setError] = useState('');
    const [showItinerary, setShowItinerary] = useState(false);

    // Validate session
    useEffect(() => {
        if (!groupCode || !userId) {
            router.push('/');
            return;
        }
    }, [groupCode, userId, router]);

    const handleGroupUpdate = (updatedGroup: Group, updatedMembers: User[]) => {
        setGroup(updatedGroup);
        setMembers(updatedMembers);
    };

    const currentUser = members.find(u => u.id === userId);

    if (!groupCode || !userId) return null;

    return (
        <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden h-full bg-black">

            {/* Background Overlay for texture */}
            <div className="absolute inset-0 bg-[url('/hero-bg.png')] opacity-10 bg-cover bg-center pointer-events-none z-0 mix-blend-overlay" />

            <div className='absolute inset-0 flex flex-col z-10'>
                {/* Header */}
                <header className="flex-none p-3 bg-black/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center shadow-lg shadow-brand-red/5">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 relative">
                            <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                        </div>
                        <div>
                            <h1 className="font-bold text-base text-white leading-tight uppercase italic tracking-wider">
                                {group?.name || 'Cargando...'}
                            </h1>
                            <p className="text-[10px] text-brand-red font-mono tracking-widest">
                                CODE: <span className="text-white">{groupCode}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowItinerary(true)}
                            className="flex items-center bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors group"
                        >
                            <Calendar className="w-4 h-4 text-brand-silver group-hover:text-white" />
                            <span className="ml-2 text-xs font-bold text-gray-300 hidden sm:inline uppercase">Cronograma</span>
                        </button>

                        <div className="flex items-center bg-brand-red/10 border border-brand-red/20 px-3 py-1.5 rounded-lg">
                            <Users className="w-4 h-4 mr-2 text-brand-red" />
                            <span className="text-sm font-bold text-brand-red">{members.filter(u => u.isOnline).length}</span>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">

                    {/* Map Container */}
                    <div className="flex-1 relative z-10">
                        <LocationManager
                            userId={userId}
                            groupCode={groupCode}
                            onGroupUpdate={handleGroupUpdate}
                            onError={(msg) => setError(msg)}
                        />

                        {error && (
                            <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-3 rounded shadow-lg z-50 text-xs font-bold uppercase tracking-wide flex items-center border border-red-400">
                                <AlertTriangle className="w-4 h-4 mr-3 flex-none" />
                                {error}
                            </div>
                        )}

                        <div className="w-full h-full bg-black/50">
                            <VenueMap
                                mapImage={group?.mapImage || ""}
                                users={members}
                                currentUser={currentUser}
                                calibration={group?.calibration}
                            />
                        </div>
                    </div>

                    {/* Member List */}
                    <div className="md:w-72 flex-none bg-black/90 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto max-h-[35vh] md:max-h-full">
                        <div className="p-3 sticky top-0 bg-black/95 border-b border-white/10 z-10 flex justify-between items-center">
                            <h2 className="text-xs font-bold text-brand-silver uppercase tracking-widest">Participantes</h2>
                            <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e] animate-pulse"></span>
                        </div>

                        <div className="divide-y divide-white/5">
                            {members.map(member => {
                                const isMe = member.id === userId;
                                const distance = currentUser && !isMe && currentUser.lastLocation && member.lastLocation
                                    ? haversineDistance(currentUser.lastLocation, member.lastLocation)
                                    : null;

                                return (
                                    <div key={member.id} className={`p-4 flex items-center justify-between hover:bg-white/5 transition-colors group ${!member.isOnline ? 'opacity-40 grayscale' : ''}`}>
                                        <div className="flex items-center min-w-0">
                                            {/* Avatar / Status Dot */}
                                            <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center font-bold text-xs border border-white/10 ${isMe ? 'bg-brand-red text-white' : 'bg-gray-800 text-gray-400'}`}>
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>

                                            <div className="truncate">
                                                <p className={`font-bold text-sm truncate ${isMe ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                                    {member.name} {isMe && <span className="text-[10px] text-brand-red bg-brand-red/10 px-1 rounded ml-1">YOU</span>}
                                                </p>
                                                <p className="text-[10px] text-gray-500 uppercase font-mono">
                                                    {member.isOnline ? 'ONLINE' : 'OFFLINE'}
                                                </p>
                                            </div>
                                        </div>

                                        {distance !== null && (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center text-xs text-brand-accent font-bold">
                                                    <Navigation className="w-3 h-3 mr-1" />
                                                    {distance < 5 ? 'Cerca' : `${distance.toFixed(0)}m`}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Itinerary Modal */}
            {showItinerary && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-lg bg-black/90 rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-brand-red/5">
                            <h3 className="font-bold text-white uppercase italic tracking-wider">Cronograma del Evento</h3>
                            <button onClick={() => setShowItinerary(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-black">
                            <div className="relative w-full h-full min-h-[500px]">
                                <Image
                                    src="/cronograma.png"
                                    alt="Cronograma"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MapPage() {
    return (
        <main className="h-screen flex flex-col bg-black text-white overflow-hidden">
            <Suspense fallback={<div className="flex items-center justify-center h-full bg-black text-brand-red font-bold animate-pulse">CARGANDO SISTEMA...</div>}>
                <MapContent />
            </Suspense>
        </main>
    );
}
