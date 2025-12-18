# Venue Tracker PWA

Aplicación web progresiva (PWA) Para localización en tiempo real en eventos, utilizando mapas personalizados y coordenadas proyectadas.

## Requisitos Previos

- Node.js 18+
- NPM

## Instalación

1.  Clonar el repositorio.
2.  Instalar dependencias:
    ```bash
    npm install
    ```
3.  Ejecutar servidor de desarrollo:
    ```bash
    npm run dev
    ```
4.  Abrir [http://localhost:3000](http://localhost:3000).

## Funcionalidades Principales

-   **Grupos y Usuarios**: Unirse o crear grupos mediante código único.
-   **Localización en Tiempo Real**: Tracking GPS proyectado sobre un plano SVG/Imagen.
-   **Mapa Personalizado**: Sistema de proyección de coordenads lat/lng a x/y pixels. calibrable.
-   **Distancias**: Cálculo de distancia haversine entre participantes.
-   **Offline/Online**: Indicadores de estado de conectividad de los usuarios.

## Despliegue en Vercel

1.  Instalar Vercel CLI o conectar repo a Vercel Dashboard.
2.  Configurar variables de entorno (ninguna requerida para la version básica en memoria).
3.  Deployar:
    ```bash
    vercel --prod
    ```

> **NOTA**: Esta aplicación usa un almacenamiento en memoria (`globalThis`). Los datos se perderán al reiniciar la instancia (nuevo deploy o inactividad). Para producción, conectar a Redis/Vercel KV reemplazando `lib/store.ts`.

## Estructura

-   `app/`: Páginas y API Routes (Next.js App Router).
-   `components/`: Componentes React (`VenueMap`, `LocationManager`).
-   `lib/`: Lógica de negocio (`store.ts`, `geometry.ts`, `types.ts`).
-   `public/`: Assets estáticos.
