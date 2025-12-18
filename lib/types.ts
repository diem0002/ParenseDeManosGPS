export type UserRole = 'member' | 'admin';

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface MapPoint {
    x: number;
    y: number;
}

export interface VenueCalibration {
    // Puntos reales (GPS) y sus correspondientes en el mapa (X/Y)
    p1: { gps: Coordinates; map: MapPoint };
    p2: { gps: Coordinates; map: MapPoint };
    scale: number; // Metros por pixel (estimado o calculado)
}

export interface User {
    id: string;
    name: string;
    groupId: string;
    role: UserRole;
    lastLocation?: Coordinates;
    lastUpdated?: number; // Timestamp
    sector?: string;
    isOnline: boolean;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
}

export interface Bet {
    id: string;
    userId: string;
    userName: string;
    fightId: string;
    prediction: 'A' | 'B';
    timestamp: number;
}

export interface Group {
    id: string; // Creates a human readable code (e.g. "AE34")
    name: string;
    members: string[]; // User IDs
    createdAt: number;
    calibration?: VenueCalibration;
    mapImage?: string; // URL o base64 (por ahora hardcoded/default)
    messages: ChatMessage[];
    bets: Bet[];
}
