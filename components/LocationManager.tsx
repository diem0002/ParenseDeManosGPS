'use client';

import { useEffect, useRef } from 'react';
import { User, Group } from '@/lib/types';

interface LocationManagerProps {
    userId: string;
    groupCode: string;
    onGroupUpdate: (group: Group, members: User[]) => void;
    onError: (msg: string) => void;
}

export const LocationManager: React.FC<LocationManagerProps> = ({
    userId,
    groupCode,
    onGroupUpdate,
    onError,
}) => {
    const pollTimer = useRef<NodeJS.Timeout | null>(null);
    const watchId = useRef<number | null>(null);

    // 1. Setup Geolocation Watcher
    useEffect(() => {
        if (!navigator.geolocation) {
            onError('Geolocation is not supported by your browser');
            return;
        }

        watchId.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await fetch('/api/location', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            lat: latitude,
                            lng: longitude,
                        }),
                    });
                } catch (e) {
                    console.error('Failed to send location', e);
                }
            },
            (error) => {
                console.error('Geolocation error', error);
                if (error.code === 1) { // PERMISSION_DENIED
                    onError(`GPS DENEGADO: Permite el acceso.`);
                } else if (error.code === 2) { // POSITION_UNAVAILABLE
                    onError(`SEÑAL DÉBIL: Buscando GPS...`);
                } else if (error.code === 3) { // TIMEOUT
                    // Silent retry for timeout, don't block UI with red banner directly
                    console.log('GPS Timeout, retrying...');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 30000, // 30s timeout to avoid flaky "timeout expired" on mobile
                maximumAge: 5000, // Accept cached position up to 5s old
            }
        );

        return () => {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        };
    }, [userId, onError]);

    // 2. Setup Polling for Group Members
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch(`/api/groups/${groupCode}`);
                if (res.status === 404) {
                    throw new Error('GROUP_NOT_FOUND');
                }
                if (!res.ok) throw new Error('Failed to fetch group');
                const data = await res.json();
                onGroupUpdate(data.group, data.members);
            } catch (e: any) {
                if (e.message === 'GROUP_NOT_FOUND') {
                    onError('GROUP_NOT_FOUND');
                } else {
                    console.warn('Polling jitter (retrying silently):', e.message);
                    // Do NOT call onError here. Network flakiness is normal on mobile.
                    // Let the UI keep showing cached state.
                }
            }
        };

        // Poll every 1 second for snappier chat
        poll(); // Initial call
        pollTimer.current = setInterval(poll, 1000);

        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, [groupCode, onGroupUpdate]);

    return null; // Logic only component
};
