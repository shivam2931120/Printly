/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: {
                    DEFAULT: '#050505',
                    card: '#0A0A0A',
                    subtle: '#0E0E0E',
                    dark: '#0A0A0A',
                    darker: '#020202',
                    light: '#050505',
                },
                foreground: {
                    DEFAULT: '#FFFFFF',
                    muted: '#666666',
                },
                border: {
                    DEFAULT: '#1A1A1A',
                    subtle: '#111111',
                    dark: '#1A1A1A',
                    light: '#1A1A1A',
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#999999',
                    muted: '#666666',
                },
                accent: {
                    DEFAULT: '#DC2626',
                    hover: '#B91C1C',
                    foreground: '#FFFFFF',
                },
                primary: {
                    DEFAULT: '#DC2626',
                    foreground: '#FFFFFF',
                    hover: '#B91C1C',
                },
                surface: {
                    light: '#0A0A0A',
                    dark: '#0A0A0A',
                    darker: '#050505',
                },
                popover: {
                    DEFAULT: '#0A0A0A',
                    foreground: '#FFFFFF',
                },
                muted: {
                    DEFAULT: '#1A1A1A',
                    foreground: '#666666',
                },
                card: {
                    DEFAULT: '#0A0A0A',
                    foreground: '#FFFFFF',
                },
                // Functional colors
                success: '#22C55E',
                warning: '#F59E0B',
                error: '#EF4444',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'Inter', 'ui-sans-serif', 'system-ui'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                'none': '0',
                'sm': '0',
                'md': '0',
                'lg': '0',
                'xl': '0',
                '2xl': '0',
                '3xl': '0',
                'full': '0',
                DEFAULT: '0',
            },
            boxShadow: {
                'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                "slide-in-right": {
                    "0%": { transform: "translateX(100%)" },
                    "100%": { transform: "translateX(0)" },
                },
                "slide-in-bottom": {
                    "0%": { transform: "translateY(100%)" },
                    "100%": { transform: "translateY(0)" },
                },
                "zoom-in": {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.2s ease-out forwards",
                "slide-in-right": "slide-in-right 0.25s ease-out forwards",
                "slide-in-bottom": "slide-in-bottom 0.25s ease-out forwards",
                "zoom-in": "zoom-in 0.2s ease-out forwards",
            },
        },
    },
    plugins: [],
}
