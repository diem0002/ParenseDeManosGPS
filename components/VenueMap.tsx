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
        return <div className="text-white p-4">Waiting for calibration...</div>;
    }

    return (
        <div className="w-full h-[60vh] bg-slate-900 overflow-hidden relative border-2 border-slate-700 rounded-lg shadow-xl">
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit
            >
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <div className="relative" style={{ width: '1000px', height: '1000px' }}> {/* Fixed container for coordinate system sanity */}
                        {/* Map Base */}
                        <img
                            src={mapImage || "/placeholder-map.svg"}
                            alt="Venue Map"
                            className="w-full h-full object-contain pointer-events-none select-none"
                        />

                        {/* Reference Points (Visual Debug) */}
                        {/* <div className="absolute w-4 h-4 bg-red-500 rounded-full" style={{ left: calibration.p1.map.x, top: calibration.p1.map.y }} /> */}
                        {/* <div className="absolute w-4 h-4 bg-blue-500 rounded-full" style={{ left: calibration.p2.map.x, top: calibration.p2.map.y }} /> */}

                        {/* Users */}
                        {renderedUsers.map((user) => (
                            <div
                                key={user.id}
                                className={clsx(
                                    "absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-linear",
                                )}
                                style={{ left: user.mapPos.x, top: user.mapPos.y }}
                            >
                                <div className={clsx(
                                    "w-4 h-4 rounded-full border-2 shadow-sm",
                                    user.id === currentUser?.id ? "bg-blue-500 border-white z-10 scale-125" : "bg-green-500 border-white"
                                )} />
                                <span className="text-[10px] bg-black/50 text-white px-1 rounded mt-1 whitespace-nowrap">
                                    {user.name}
                                    {user.id === currentUser?.id && " (Tú)"}
                                </span>
                            </div>
                        ))}
                    </div>
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
};
