'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Group, User } from '@/lib/types';
import { haversineDistance } from '@/lib/geometry';
import { VenueMap } from '@/components/VenueMap';
import { LocationManager } from '@/components/LocationManager';
import { Users, Navigation, AlertTriangle, Calendar, X, MessageSquare, Map as MapIcon, Send } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';

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

    // UI State
    const [activeTab, setActiveTab] = useState<'map' | 'chat' | 'members'>('map');
    const [chatMessage, setChatMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Validate session
    useEffect(() => {
        if (!groupCode || !userId) {
            router.push('/');
            return;
        }
    }, [groupCode, userId, router]);

    const handleGroupUpdate = useCallback((updatedGroup: Group, updatedMembers: User[]) => {
        setGroup(updatedGroup);
        setMembers(updatedMembers);
    }, []);

    const handleError = useCallback((msg: string) => {
        setError(msg);
    }, []);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMessage.trim() || !userId || !groupCode) return;

        // Optimistic UI Update
        const tempMessage = {
            id: 'temp-' + Date.now(),
            senderId: userId,
            senderName: currentUser?.name || 'Yo',
            text: chatMessage,
            timestamp: Date.now()
        };

        if (group) {
            setGroup({
                ...group,
                messages: [...(group.messages || []), tempMessage]
            });
        }

        setChatMessage('');

        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: groupCode,
                    userId,
                    userName: currentUser?.name || 'Unknown',
                    text: tempMessage.text
                })
            });
        } catch (e) {
            console.error('Send failed', e);
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        if (activeTab === 'chat' || window.innerWidth > 768) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [group?.messages?.length, activeTab]);

    const currentUser = members.find(u => u.id === userId);

    if (!groupCode || !userId) return null;

    const messages = group?.messages || [];

    return (
        <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden h-full bg-black">

            {/* Background Overlay */}
            <div className="absolute inset-0 bg-[url('/hero-bg.png')] opacity-10 bg-cover bg-center pointer-events-none z-0 mix-blend-overlay" />

            {/* Desktop: Sidebar Container (Members + Chat) - Hidden on Mobile */}
            <div className="hidden md:flex w-80 bg-black/90 backdrop-blur-xl border-r border-white/10 flex-col z-20">
                {/* Desktop Sidebar Content (Full height) */}
                <div className="p-4 border-b border-white/10 flex items-center space-x-3">
                    <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
                    <div>
                        <h1 className="font-bold text-sm text-white uppercase italic">{group?.name}</h1>
                        <p className="text-[10px] text-brand-red font-mono">CODE: {groupCode}</p>
                    </div>
                </div>

                {/* Members List (Top Half) */}
                <div className="flex-1 overflow-y-auto border-b border-white/10 p-2 max-h-[50%]">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Miembros ({members.filter(m => m.isOnline).length})</h3>
                    {members.map(member => (
                        <div key={member.id} className="flex items-center p-2 rounded hover:bg-white/5">
                            <div className={clsx("w-2 h-2 rounded-full mr-2", member.isOnline ? "bg-green-500" : "bg-gray-600")} />
                            <span className={clsx("text-sm", member.id === userId ? "text-brand-red font-bold" : "text-gray-300")}>
                                {member.name} {member.id === userId && "(Tú)"}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Chat (Bottom Half) */}
                <div className="flex-1 flex flex-col min-h-[300px] bg-black/50">
                    <div className="p-2 border-b border-white/5 bg-white/5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chat de Grupo</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className="flex flex-col">
                                <div className="flex items-baseline justify-between">
                                    <span className={clsx("text-xs font-bold", msg.senderId === userId ? "text-brand-red" : "text-blue-400")}>
                                        {msg.senderName}
                                    </span>
                                    <span className="text-[9px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-sm text-gray-300 break-words">{msg.text}</p>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex gap-2">
                        <input
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            className="flex-1 bg-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
                            placeholder="Escribe algo..."
                        />
                        <button type="submit" className="text-brand-red hover:text-white transition-colors">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>


            {/* Main Content Area (Mobile: Full Screen with Overlays / Desktop: Map) */}
            <div className="flex-1 relative flex flex-col overflow-hidden z-10 w-full h-full">

                {/* Mobile Header (Only visible on mobile) */}
                <header className="md:hidden flex-none p-3 bg-black/90 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-50">
                    <div className="flex items-center space-x-2">
                        <Image src="/logo.png" alt="Logo" width={30} height={30} />
                        <span className="font-bold text-white text-sm tracking-wider uppercase">{groupCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowItinerary(true)} className="p-2 bg-white/10 rounded-full">
                            <Calendar className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </header>

                <LocationManager
                    userId={userId}
                    groupCode={groupCode}
                    onGroupUpdate={handleGroupUpdate}
                    onError={handleError}
                />

                {/* Visual Error Toast */}
                {error && (
                    <div className="absolute top-16 left-4 right-4 bg-red-600/90 text-white p-2 rounded shadow-lg z-[60] text-xs font-bold uppercase flex items-center justify-center backdrop-blur-sm">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {error}
                    </div>
                )}

                {/* Map Layer - Always rendered but z-index changes based on active tab in mobile */}
                <div className={clsx(
                    "absolute inset-0 w-full h-full transition-opacity duration-300",
                    // On mobile, if chat/members are open, fade map slightly or keep it visible
                    // We'll keep it fully visible as background for now.
                )}>
                    <VenueMap
                        mapImage={group?.mapImage || ""}
                        users={members}
                        currentUser={currentUser}
                        calibration={group?.calibration}
                    />

                    {/* Dev Teleport Button */}
                    <div className="absolute bottom-24 left-4 z-30 md:bottom-4">
                        <button
                            onClick={() => {
                                if (currentUser && currentUser.lastLocation) {
                                    // Teleport slightly to move
                                    fetch('/api/location', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: currentUser.id, lat: -34.643494, lng: -58.396511 })
                                    });
                                }
                            }}
                            className="bg-black/60 backdrop-blur text-white/50 text-[9px] px-2 py-1 rounded border border-white/10 hover:text-white"
                        >
                            🧪 TELEPORT
                        </button>
                    </div>
                </div>

                {/* MOBILE OVERLAYS: Chat & Members */}

                {/* Chat Overlay (Mobile) */}
                <div className={clsx(
                    "md:hidden absolute inset-0 bg-black/95 z-40 flex flex-col transition-transform duration-300 transform pt-16 pb-20",
                    activeTab === 'chat' ? "translate-y-0" : "translate-y-full"
                )}>
                    {/* Chat Header with Close Button */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50">
                        <h2 className="text-lg font-bold text-white uppercase italic">Chat de Grupo</h2>
                        <button onClick={() => setActiveTab('map')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && <p className="text-center text-gray-600 text-sm mt-10">Sé el primero en hablar...</p>}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={clsx("flex flex-col max-w-[85%]", msg.senderId === userId ? "self-end items-end" : "self-start items-start")}>
                                <span className="text-[10px] text-gray-500 mb-1">{msg.senderName}</span>
                                <div className={clsx("px-4 py-2 rounded-2xl text-sm break-words", msg.senderId === userId ? "bg-brand-red text-white rounded-br-none" : "bg-gray-800 text-white rounded-bl-none")}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2 bg-black">
                        <input
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            className="flex-1 bg-white/10 rounded-full px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-brand-red"
                            placeholder="Mensaje..."
                        />
                        <button type="submit" className="bg-brand-red p-3 rounded-full text-white shadow-lg shadow-brand-red/30">
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>

                {/* Members Overlay (Mobile) */}
                <div className={clsx(
                    "md:hidden absolute inset-0 bg-black/95 z-40 flex flex-col transition-transform duration-300 transform pt-16 pb-20",
                    activeTab === 'members' ? "translate-y-0" : "translate-y-full"
                )}>
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/50">
                        <h2 className="text-lg font-bold text-white uppercase italic">Miembros ({members.length})</h2>
                        <button onClick={() => setActiveTab('map')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center">
                                    <div className={clsx("w-3 h-3 rounded-full mr-3 shadow-[0_0_8px_currentColor]", member.isOnline ? "bg-green-500 text-green-500" : "bg-gray-600 text-gray-600")} />
                                    <div>
                                        <p className="font-bold text-white">{member.name}</p>
                                        <p className="text-xs text-gray-500">{member.isOnline ? 'ONLINE' : 'OFFLINE'}</p>
                                    </div>
                                </div>
                                {member.id !== userId && currentUser?.lastLocation && member.lastLocation && (
                                    <div className="text-brand-red font-bold text-sm bg-brand-red/10 px-2 py-1 rounded">
                                        <Navigation className="w-3 h-3 inline mr-1" />
                                        {(() => {
                                            const d = haversineDistance(currentUser.lastLocation!, member.lastLocation!);
                                            return d < 20 ? 'Cerca' : `${d.toFixed(0)}m`;
                                        })()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-20">
                    <button
                        onClick={() => setActiveTab('map')}
                        className={clsx("flex flex-col items-center gap-1 transition-colors", activeTab === 'map' ? "text-brand-red" : "text-gray-500")}
                    >
                        <MapIcon className={clsx("w-6 h-6", activeTab === 'map' && "drop-shadow-[0_0_8px_rgba(213,0,0,0.5)]")} />
                        <span className="text-[10px] font-bold uppercase">Mapa</span>
                    </button>

                    <button
                        onClick={() => setActiveTab(activeTab === 'members' ? 'map' : 'members')}
                        className={clsx("flex flex-col items-center gap-1 transition-colors", activeTab === 'members' ? "text-brand-red" : "text-gray-500")}
                    >
                        <Users className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase">Gente</span>
                    </button>

                    <button
                        onClick={() => setActiveTab(activeTab === 'chat' ? 'map' : 'chat')}
                        className={clsx("flex flex-col items-center gap-1 transition-colors relative", activeTab === 'chat' ? "text-brand-red" : "text-gray-500")}
                    >
                        <MessageSquare className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase">Chat</span>
                        {/* Unread dot simulation */}
                        {messages.length > 0 && activeTab !== 'chat' && (
                            <span className="absolute top-0 right-2 w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        )}
                    </button>
                </div>

            </div>

            {/* Itinerary Modal (Reused) */}
            {showItinerary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-lg bg-black/90 rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-brand-red/5">
                            <h3 className="font-bold text-white uppercase italic tracking-wider">Cronograma</h3>
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
            <Suspense fallback={<div className="flex items-center justify-center h-full bg-black text-red-600 font-bold animate-pulse uppercase tracking-[0.5em]">Cargando Sistema...</div>}>
                <MapContent />
            </Suspense>
        </main>
    );
}
