'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Group, User } from '@/lib/types';
import { haversineDistance } from '@/lib/geometry';
import { VenueMap } from '@/components/VenueMap';
import { LocationManager } from '@/components/LocationManager';
import { Users, Navigation, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function MapContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const groupCode = searchParams.get('code');
    const userId = searchParams.get('uid');

    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

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
        setLoading(false);
    };

    const currentUser = members.find(u => u.id === userId);

    if (!groupCode || !userId) return null;

    return (
        <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden h-full">
            {/* Header handled in parent or here? Let's keep structure but since we split components, 
          we need to be careful about layout. Ideally MapContent is just the inside.
          But to match previous design, let's put the whole UI inside.
       */}
            <div className='absolute inset-0 flex flex-col'>
                {/* Header */}
                <header className="flex-none p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-20 shadow-md">
                    <div>
                        <h1 className="font-bold text-lg flex items-center">
                            <span className="bg-blue-600 text-xs px-2 py-0.5 rounded mr-2">LIVE</span>
                            {group?.name || 'Cargando...'}
                        </h1>
                        <p className="text-xs text-slate-400 font-mono">CODE: {groupCode}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center bg-slate-800 px-3 py-1 rounded-full">
                            <Users className="w-4 h-4 mr-2 text-blue-400" />
                            <span className="text-sm font-bold">{members.filter(u => u.isOnline).length}</span>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">

                    {/* Map Container */}
                    <div className="flex-1 relative z-10 bg-slate-900/50">
                        <LocationManager
                            userId={userId}
                            groupCode={groupCode}
                            onGroupUpdate={handleGroupUpdate}
                            onError={(msg) => setError(msg)}
                        />

                        {error && (
                            <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg z-50 text-sm flex items-center shadow-lg backdrop-blur-sm">
                                <AlertTriangle className="w-5 h-5 mr-3 flex-none" />
                                {error}
                            </div>
                        )}

                        <div className="w-full h-full p-2">
                            <VenueMap
                                mapImage={group?.mapImage || ""}
                                users={members}
                                currentUser={currentUser}
                                calibration={group?.calibration}
                            />
                        </div>
                    </div>

                    {/* Member List */}
                    <div className="md:w-80 flex-none bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 overflow-y-auto max-h-[40vh] md:max-h-full">
                        <div className="p-4 sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Miembros</h2>
                        </div>

                        <div className="divide-y divide-slate-800">
                            {members.map(member => {
                                const isMe = member.id === userId;
                                const distance = currentUser && !isMe && currentUser.lastLocation && member.lastLocation
                                    ? haversineDistance(currentUser.lastLocation, member.lastLocation)
                                    : null;

                                return (
                                    <div key={member.id} className={`p-4 flex items-center justify-between hover:bg-slate-800 transition-colors ${!member.isOnline ? 'opacity-50' : ''}`}>
                                        <div className="flex items-center min-w-0">
                                            <div className={`w-2 h-2 rounded-full mr-3 flex-none ${member.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`} />
                                            <div className="truncate">
                                                <p className={`font-medium text-sm truncate ${isMe ? 'text-blue-400' : 'text-slate-200'}`}>
                                                    {member.name} {isMe && '(Tú)'}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    {member.isOnline ? 'En línea' : `Visto hace ${(Date.now() - (member.lastUpdated || 0)) / 1000 | 0}s`}
                                                </p>
                                            </div>
                                        </div>

                                        {distance !== null && (
                                            <div className="flex items-center text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                                                <Navigation className="w-3 h-3 mr-1" />
                                                {distance < 5 ? '< 5m' : `${distance.toFixed(0)}m`}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MapPage() {
    return (
        <main className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
            <Suspense fallback={<div className="flex items-center justify-center h-full">Cargando mapa...</div>}>
                <MapContent />
            </Suspense>
        </main>
    );
}
