import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    red: '#D50000', // Rojo intenso/sangre (estimado de la imagen)
                    dark: '#0a0a0a',
                    silver: '#C0C0C0',
                    accent: '#FF1744'
                }
            },
            backgroundImage: {
                'hero-pattern': "url('/hero-bg.png')",
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            },
            fontFamily: {
                // Podríamos agregar una fuente custom tipo "Impact" o similar si estuviera disponible,
                // por ahora usaremos sans-serif heavy.
                display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
};
export default config;
