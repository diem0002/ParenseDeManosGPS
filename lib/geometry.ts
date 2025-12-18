import { Coordinates, MapPoint, VenueCalibration } from './types';

// Convertir grados a radianes
const toRad = (value: number) => (value * Math.PI) / 180;

/**
 * Calcula la distancia en metros entre dos coordenadas GPS usando la fórmula de Haversine.
 */
export function haversineDistance(c1: Coordinates, c2: Coordinates): number {
    const R = 6371e3; // Radio de la tierra en metros
    const φ1 = toRad(c1.lat);
    const φ2 = toRad(c2.lat);
    const Δφ = toRad(c2.lat - c1.lat);
    const Δλ = toRad(c2.lng - c1.lng);

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Proyecta coordenadas GPS (lat, lon) a coordenadas cartesianas (x, y) del mapa
 * basándose en una calibración de 2 puntos.
 * Asume una proyección plana simple (suficiente para escalas pequeñas < 1km).
 */
export function projectToMap(
    current: Coordinates,
    calibration: VenueCalibration
): MapPoint {
    const { p1, p2 } = calibration;

    // Diferencia de GPS entre los puntos de calibración
    const dLat = p2.gps.lat - p1.gps.lat;
    const dLng = p2.gps.lng - p1.gps.lng;

    // Diferencia de mapa entre los puntos de calibración
    const dX = p2.map.x - p1.map.x;
    const dY = p2.map.y - p1.map.y;

    // Evitar división por cero
    if (Math.abs(dLat) < 1e-9 && Math.abs(dLng) < 1e-9) return p1.map;

    // Proyección lineal simple (interpolación)
    // X se correlaciona principalmente con Longitud, Y con Latitud (o viceversa según rotación)
    // Pero para máxima generalidad con rotación, usamos álgebra lineal básica o simplificamos asumiendo Norte=Arriba si es posible.
    // Dado que el mapa puede estar rotado, usamos una transformación afín simplificada o proyección relativa.

    // Enfoque simplificado: Interpolación relativa a un vector base
    // Vector base GPS (P1 -> P2)
    // Vector base Mapa (P1 -> P2)

    // Para este MVP, asumiremos que el mapa está "mas o menos" orientado o usaremos una regla de 3 simple por eje
    // si el usuario alinea los puntos.
    // Sin embargo, para hacerlo bien con rotación arbitraria, necesitamos transformar el vector.

    // Calculamos el vector del usuario relativo a P1
    const uLat = current.lat - p1.gps.lat;
    const uLng = current.lng - p1.gps.lng;

    // Proyección escalar sobre el vector P1->P2 no es suficiente si hay "skew" o rotación 2D.
    // Implementación robusta: Transformación afín
    // [x]   [a b] [lng]   [tx]
    // [y] = [c d] [lat] + [ty]
    // Necesitamos 3 puntos para resolver a,b,c,d,tx,ty inequívocamente o asumir isotropía (escala uniforme).

    // Asumiendo escala uniforme y rotación:
    // 1. Convertir Geo a Metros relativos a P1 (Plano tangente)
    const xMeters = haversineDistance({ lat: p1.gps.lat, lng: p1.gps.lng }, { lat: p1.gps.lat, lng: current.lng }) * (current.lng > p1.gps.lng ? 1 : -1);
    const yMeters = haversineDistance({ lat: p1.gps.lat, lng: p1.gps.lng }, { lat: current.lat, lng: p1.gps.lng }) * (current.lat > p1.gps.lat ? 1 : -1);

    // 2. Calcular Metros y Pixeles de P1 a P2
    const p2xMeters = haversineDistance({ lat: p1.gps.lat, lng: p1.gps.lng }, { lat: p1.gps.lat, lng: p2.gps.lng }) * (p2.gps.lng > p1.gps.lng ? 1 : -1);
    const p2yMeters = haversineDistance({ lat: p1.gps.lat, lng: p1.gps.lng }, { lat: p2.gps.lat, lng: p1.gps.lng }) * (p2.gps.lat > p1.gps.lat ? 1 : -1);

    // Relación entre sistema de metros y sistema de pixeles
    // Esta parte es compleja sin librerías. 

    // ALTERNATIVA SIMPLE: Interpolación lineal directa por ejes (asume mapa orientado al norte)
    // X = p1.map.x + (current.lng - p1.gps.lng) * (dX / dLng)
    // Y = p1.map.y + (current.lat - p1.gps.lat) * (dY / dLat)

    // Usaremos esta alternativa simple para el MVP. Si el mapa está rotado, fallará.
    // TODO: Agregar soporte para rotación en el futuro.

    const scaleX = Math.abs(dLng) > 1e-6 ? dX / dLng : 0;
    const scaleY = Math.abs(dLat) > 1e-6 ? dY / dLat : 0;

    const x = p1.map.x + (current.lng - p1.gps.lng) * scaleX;
    const y = p1.map.y + (current.lat - p1.gps.lat) * scaleY;

    return { x, y };
}
