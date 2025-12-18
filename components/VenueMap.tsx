'use client';

import React, { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { User, VenueCalibration } from '@/lib/types';
import { projectToMap } from '@/lib/geometry';
import clsx from 'clsx';
import Image from 'next/image';

interface VenueMapProps {
    mapImage: string;
    users: User[];
    currentUser?: User;
    calibration?: VenueCalibration;
}

export const VenueMap: React.FC<VenueMapProps> = ({
    mapImage,
    users,
    currentUser,
    calibration,
}) => {
    // Memoize users positions to avoid excessive recalculations if not needed,
    // though projection is cheap.
    const renderedUsers = useMemo(() => {
        if (!calibration) return [];

        return users.map((u) => {
            if (!u.lastLocation) return null;
            const pos = projectToMap(u.lastLocation, calibration);
            return { ...u, mapPos: pos };
        }).filter((u): u is User & { mapPos: { x: number, y: number } } => u !== null);
    }, [users, calibration]);

    if (!calibration) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/80 text-white animate-pulse">
                <p className="text-xl font-bold uppercase tracking-widest text-brand-red">Cargando Mapa...</p>
                <p className="text-xs text-gray-500 mt-2">Sincronizando satélites...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-black/20 overflow-hidden relative">
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit={true}
                limitToBounds={true}
                alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
            >
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                    <div className="relative shadow-2xl" style={{ width: '1000px', height: '1000px' }}>
                        {/* Map Base */}
                        <img
                            src={mapImage || "/placeholder-map.svg"}
                            alt="Venue Map"
                            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-2xl"
                        />

                        {/* Users */}
                        {renderedUsers.map((user) => {
                            const isOffMap = user.mapPos.x < -2000 || user.mapPos.x > 3000 || user.mapPos.y < -2000 || user.mapPos.y > 3000;

                            if (isOffMap) return null; // Don't render extremely far users to avoid layout bugs

                            return (
                                <div
                                    key={user.id}
                                    className={clsx(
                                        "absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-linear z-10",
                                    )}
                                    style={{ left: user.mapPos.x, top: user.mapPos.y }}
                                >
                                    <div className={clsx(
                                        "w-4 h-4 rounded-full border-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                        user.id === currentUser?.id
                                            ? "bg-brand-red border-white z-20 scale-125 animate-pulse"
                                            : "bg-white border-brand-red"
                                    )} />
                                    <span className={clsx(
                                        "text-[10px] px-1 rounded mt-1 whitespace-nowrap font-bold",
                                        user.id === currentUser?.id
                                            ? "bg-brand-red text-white"
                                            : "bg-black/70 text-white"
                                    )}>
                                        {user.name}
                                        {user.id === currentUser?.id && " (Tú)"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </TransformComponent>
            </TransformWrapper>

            {/* Compass / North indicator (optional aesthetic) */}
            <div className="absolute top-4 right-4 text-white/20 pointer-events-none">
                <div className="border-2 border-current w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">N</div>
            </div>
        </div>
    );
};
