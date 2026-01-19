/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                banana: {
                    yellow: '#FFE135',
                    cream: '#FEF9E7',
                    brown: '#5D4037',
                    ripe: '#FFD700',
                    leaf: '#87A96B',
                },
                neon: {
                    blue: '#00F3FF',    // Cyan/Electric Blue
                    pink: '#BC13FE',    // Neon Purple/Pink
                    magenta: '#FF00FF', // Pure Magenta
                    void: '#0F172A',    // Deep Slate/Charcoal
                    grid: '#1E293B',    // Lighter grid background
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
