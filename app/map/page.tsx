'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Group, User } from '@/lib/types';
import { haversineDistance } from '@/lib/geometry';
import { VenueMap } from '@/components/VenueMap';
import { LocationManager } from '@/components/LocationManager';
import { Users, Navigation, AlertTriangle, Calendar, X, MessageSquare, Map as MapIcon, Send, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';
import { playNotificationSound } from '@/lib/sound';

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
    const [isTyping, setIsTyping] = useState(false); // Track keyboard state

    const currentUser = members.find(u => u.id === userId);

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
        setGroup(prevGroup => {
            if (!prevGroup) return updatedGroup;

            // --- SMART MERGE STRATEGY (SERVER AMNESIA PROTECTION) ---
            // Issue: Vercel serverless resets memory often, returning empty lists.
            // Fix: We assume chat is "Append Only". We never delete messages locally unless explicitly cleared.

            const serverMessages = updatedGroup.messages || [];
            const localMessages = prevGroup.messages || [];

            // 1. Start with what we have locally
            let mergedMessages = [...localMessages];

            // 2. Add ANY new message from server that we don't have
            serverMessages.forEach(serverMsg => {
                const exists = mergedMessages.some(m => m.id === serverMsg.id);
                if (!exists) {
                    mergedMessages.push(serverMsg);
                }
            });

            // 3. Re-verify "temp-" messages
            // If a temp message matches a confirmed server message (by content/sender), remove the temp one.
            mergedMessages = mergedMessages.filter(msg => {
                if (!msg.id.startsWith('temp-')) return true; // Keep confirmed

                // Check if this temp msg is now confirmed in the server list
                // (We loosely match timestamp to within 30s to be safe)
                const isNowConfirmed = serverMessages.some(sm =>
                    sm.senderId === msg.senderId &&
                    sm.text === msg.text &&
                    Math.abs(sm.timestamp - msg.timestamp) < 30000
                );
                return !isNowConfirmed; // Keep only if NOT yet confirmed
            });

            // 4. Sort strictly by timestamp
            mergedMessages.sort((a, b) => a.timestamp - b.timestamp);

            // 5. Keep only last 100 to avoid memory overflow over long sessions
            if (mergedMessages.length > 100) {
                mergedMessages = mergedMessages.slice(mergedMessages.length - 100);
            }

            return {
                ...updatedGroup, // Update map settings from server
                messages: mergedMessages // Use our robust message list
            };
        });

        // --- MEMBER PERSISTENCE ---
        // Don't clear members if server glitches and returns empty (unless explicitly empty Group)
        setMembers(prevMembers => {
            if (updatedMembers.length === 0 && prevMembers.length > 0) {
                // Warning: Server returned no members? Suspicious. Keep old ones for a bit?
                // Actually, if list is empty it implies invalid group or reset. 
                // But for stability, let's trust server ONLY if it isn't a likely glitch.
                // Given the constraint, we'll accept server truth BUT filters out obviously broken states if needed.
                // For now, let's just use updatedMembers but knowing the backend has a 120s timeout, it should be fine.
                return updatedMembers;
            }
            // Better strategy: Merge online status? No, backend handles that.
            // Just return updatedMembers is fine IF backend store logic is fixed (which we did: 120s timeout)
            return updatedMembers;
        });
    }, []);

    const handleError = useCallback((msg: string) => {
        if (msg === 'GROUP_NOT_FOUND') {
            // Attempt auto-resurrection
            console.log('Group lost, attempting resurrection...');

            // Try to recover name from local storage if not in memory
            let recoverName = currentUser?.name || 'User';
            if (typeof window !== 'undefined' && !currentUser?.name) {
                try {
                    const cached = localStorage.getItem('venue_tracker_user');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed.name) recoverName = parsed.name;
                    }
                } catch (e) { /* ignore */ }
            }

            fetch('/api/groups/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: recoverName,
                    groupCode: groupCode,
                    action: 'create', // Explicitly recreate
                    calibration: { // Re-send default calibration
                        p1: { gps: { lat: -34.643494, lng: -58.396511 }, map: { x: 500, y: 500 } },
                        p2: { gps: { lat: -34.644494, lng: -58.396511 }, map: { x: 500, y: 900 } },
                        scale: 1
                    }
                })
            }).then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    // Silent recovery
                    setGroup(data.group);
                } else {
                    setError('SESIÓN EXPIRADA. Saliendo...');
                    setTimeout(() => router.push('/'), 2000);
                }
            }).catch(() => {
                setError('SESIÓN EXPIRADA. Saliendo...');
                setTimeout(() => router.push('/'), 2000);
            });
        } else {
            setError(msg);
        }
    }, [groupCode, currentUser, router]);

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

    // Auto-scroll chat & Sound
    useEffect(() => {
        const msgs = group?.messages || [];
        if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            // Play sound if new message from others and recent (within 5s to avoid initial load spam)
            const isRecent = Date.now() - lastMsg.timestamp < 5000;
            if (lastMsg.senderId !== userId && isRecent && activeTab !== 'chat') {
                playNotificationSound();
            }
        }

        if (activeTab === 'chat' || window.innerWidth > 768) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [group?.messages, activeTab, userId]);



    if (!groupCode || !userId) return null;

    const messages = group?.messages || [];

    return (
        <div className="flex flex-col h-[100dvh] bg-black overflow-hidden relative">

            {/* Background Overlay */}
            <div className="absolute inset-0 bg-[url('/hero-bg.png')] opacity-10 bg-cover bg-center pointer-events-none z-0 mix-blend-overlay" />

            {/* HEADER FIJO (Siempre visible en móvil - Z-INDEX 60 = ABOVE EVERYTHING) */}
            <header className="flex-none h-16 bg-black/95 backdrop-blur-md border-b border-white/10 flex justify-between items-center px-4 z-[60] shadow-lg">
                <div className="flex items-center space-x-3">
                    {/* RESTORED ORIGINAL LOGO */}
                    <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
                    <div>
                        <h1 className="font-bold text-white text-xs tracking-wider uppercase leading-tight">PARENSE DE MANOS</h1>
                        {/* INCREASED FONT SIZE FOR CODE VISIBILITY */}
                        <p className="text-xs text-brand-red font-bold font-mono tracking-widest bg-white/5 px-2 py-0.5 rounded mt-0.5 border border-white/5">
                            CODE: {groupCode}
                        </p>
                    </div>
                </div>
                <div>
                    <button onClick={() => setShowItinerary(true)} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors">
                        <Calendar className="w-5 h-5 text-white" />
                    </button>
                </div>
            </header>

            {/* AREA PRINCIPAL (Flexible) */}
            <main className="flex-1 relative overflow-hidden w-full bg-black">

                <LocationManager
                    userId={userId}
                    groupCode={groupCode}
                    onGroupUpdate={handleGroupUpdate}
                    onError={handleError}
                />

                {/* Visual Error Toast */}
                {error && (
                    <div className="absolute top-4 left-4 right-4 bg-red-600/90 text-white p-2 rounded shadow-lg z-[60] text-xs font-bold uppercase flex items-center justify-center backdrop-blur-sm animate-pulse">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {error}
                    </div>
                )}

                {/* --- CAPA 1: MAPA (Fondo siempre presente) --- */}
                {/* Always rendered, z-0. Overlays will cover it visually but layout remains stable. */}
                <div className="absolute inset-0 z-0">
                    <VenueMap
                        mapImage={group?.mapImage || ""}
                        users={members}
                        currentUser={currentUser}
                        calibration={group?.calibration}
                    />

                    {/* ZONE ALERT OVERLAY */}
                    {currentUser?.lastLocation && (() => {
                        // Simple 800m radius check from Stadium Center (P1 approx)
                        const center = { lat: -34.643494, lng: -58.396511 };
                        const dist = haversineDistance(currentUser.lastLocation, center);
                        if (dist > 800) {
                            return (
                                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-2 rounded-full shadow-lg z-10 animate-bounce flex items-center whitespace-nowrap">
                                    <AlertTriangle className="w-4 h-4 text-white mr-2" />
                                    <span className="text-white font-black uppercase text-xs tracking-widest">FUERA DE ZONA ({Math.round(dist)}m)</span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>

                {/* --- CAPA 2: PANELES SUPERPUESTOS (Chat / Gente) --- */}

                {/* CHAT PANEL */}
                {activeTab === 'chat' && (
                    <div className="absolute inset-0 z-20 flex flex-col bg-black/95 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                    <MessageSquare className="w-12 h-12 mb-2" />
                                    <p className="text-sm">Sin mensajes aún</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={clsx("flex flex-col max-w-[85%]", msg.senderId === userId ? "self-end items-end" : "self-start items-start")}>
                                    <span className="text-[10px] text-gray-500 mb-1">{msg.senderName}</span>
                                    <div className={clsx("px-4 py-2 rounded-2xl text-sm break-words shadow-sm", msg.senderId === userId ? "bg-brand-red text-white rounded-br-none" : "bg-zinc-800 text-white rounded-bl-none")}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input sticky at bottom of main area */}
                        <form onSubmit={sendMessage} className="flex-none p-3 border-t border-white/10 flex gap-2 bg-zinc-900 shadow-xl z-30 pb-safe">
                            <input
                                value={chatMessage}
                                onChange={e => setChatMessage(e.target.value)}
                                className="flex-1 bg-black rounded-full px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-red border border-white/10"
                                placeholder="Escribe un mensaje..."
                                onFocus={() => setIsTyping(true)}
                                onBlur={() => setTimeout(() => setIsTyping(false), 100)} // Delay to allow button click
                            />
                            <button type="submit" className="bg-brand-red w-12 h-12 flex items-center justify-center rounded-full text-white shadow-lg shadow-brand-red/30 active:scale-95 transition-transform">
                                <Send className="w-5 h-5 ml-0.5" />
                            </button>
                        </form>
                    </div>
                )}

                {/* MEMBERS PANEL */}
                {activeTab === 'members' && (
                    <div className="absolute inset-0 z-20 flex flex-col bg-black/95 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5 shadow-sm">
                                    <div className="flex items-center">
                                        <div className={clsx("w-3 h-3 rounded-full mr-4 shadow-[0_0_8px_currentColor]", member.isOnline ? "bg-green-500 text-green-500" : "bg-gray-600 text-gray-600")} />
                                        <div>
                                            <p className="font-bold text-white text-lg">
                                                {member.name} {member.name === 'User' && <span className="text-gray-500 text-xs">(Usuario)</span>}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono tracking-wide">{member.isOnline ? 'EN LÍNEA' : 'OFFLINE'}</p>
                                        </div>
                                    </div>
                                    {member.id !== userId && currentUser?.lastLocation && member.lastLocation && (
                                        <div className="flex flex-col items-end">
                                            <div className="text-brand-red font-bold text-sm bg-brand-red/10 px-3 py-1 rounded-lg flex items-center">
                                                <Navigation className="w-3 h-3 inline mr-1.5" />
                                                {(() => {
                                                    const d = haversineDistance(currentUser.lastLocation!, member.lastLocation!);
                                                    return d < 20 ? 'Cerca' : `${d.toFixed(0)}m`;
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </main>

            {/* NAV BAR FIJA (Siempre visible abajo, EXCEPTO al escribir) */}
            {!isTyping && (
                <nav className="flex-none h-20 bg-black/95 border-t border-white/10 flex justify-around items-center px-2 pb-safe z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                    <button
                        onClick={() => setActiveTab('map')}
                        className={clsx("flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 w-1/3 active:scale-95", activeTab === 'map' ? "text-brand-red" : "text-gray-500")}
                    >
                        <MapIcon className={clsx("w-6 h-6", activeTab === 'map' && "drop-shadow-[0_0_8px_rgba(213,0,0,0.6)]")} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Mapa</span>
                        {activeTab === 'map' && <div className="h-1 w-1 bg-brand-red rounded-full mt-1" />}
                    </button>

                    <button
                        onClick={() => setActiveTab('members')}
                        className={clsx("flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 w-1/3 active:scale-95", activeTab === 'members' ? "text-brand-red" : "text-gray-500")}
                    >
                        <Users className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Gente</span>
                        {activeTab === 'members' && <div className="h-1 w-1 bg-brand-red rounded-full mt-1" />}
                    </button>

                    <button
                        onClick={() => setActiveTab('chat')}
                        className={clsx("flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 w-1/3 active:scale-95 relative", activeTab === 'chat' ? "text-brand-red" : "text-gray-500")}
                    >
                        <MessageSquare className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
                        {activeTab === 'chat' && <div className="h-1 w-1 bg-brand-red rounded-full mt-1" />}

                        {/* Unread Indicator */}
                        {messages.length > 0 && activeTab !== 'chat' && (
                            <span className="absolute top-2 right-8 w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]" />
                        )}
                    </button>
                </nav>
            )}

            {/* Itinerary Modal (Global) - Z-INDEX 100 ABOVE EVERYTHING */}
            {showItinerary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
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
        // Ensure viewport height handles mobile browser bars correctly
        <main className="h-[100dvh] flex flex-col bg-black text-white overflow-hidden">
            <Suspense fallback={<div className="flex items-center justify-center h-full bg-black text-red-600 font-bold animate-pulse uppercase tracking-[0.5em]">Cargando...</div>}>
                <MapContent />
            </Suspense>
        </main>
    );
}
