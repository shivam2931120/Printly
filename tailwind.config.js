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
                    DEFAULT: '#000000',
                    card: '#0A0A0A',
                    subtle: '#111111',
                    dark: '#0A0A0A',
                    darker: '#000000',
                    light: '#161616',
                },
                foreground: {
                    DEFAULT: '#FFFFFF',
                    muted: '#888888',
                },
                border: {
                    DEFAULT: '#1C1C1C',
                    subtle: '#141414',
                    dark: '#1C1C1C',
                    light: '#2A2A2A',
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#BBBBBB',
                    muted: '#888888',
                },
                accent: {
                    DEFAULT: '#E53E3E',
                    hover: '#C53030',
                    foreground: '#FFFFFF',
                },
                primary: {
                    DEFAULT: '#E53E3E',
                    foreground: '#FFFFFF',
                    hover: '#C53030',
                },
                surface: {
                    light: '#111111',
                    dark: '#0A0A0A',
                    darker: '#000000',
                },
                popover: {
                    DEFAULT: '#0A0A0A',
                    foreground: '#FFFFFF',
                },
                muted: {
                    DEFAULT: '#111111',
                    foreground: '#888888',
                },
                card: {
                    DEFAULT: '#0A0A0A',
                    foreground: '#FFFFFF',
                },
                success: '#22C55E',
                warning: '#EAB308',
                error: '#E53E3E',
            },
            borderRadius: {
                'sm': '0.375rem',
                DEFAULT: '0.75rem',
                'md': '0.75rem',
                'lg': '1rem',
                'xl': '1.25rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'Inter', 'ui-sans-serif', 'system-ui'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'glow-red': '0 0 20px rgba(229, 62, 62, 0.15)',
                'glow-red-lg': '0 0 40px rgba(229, 62, 62, 0.2)',
                'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
                'card-hover': '0 8px 32px rgba(0, 0, 0, 0.6)',
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
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in-up": {
                    "0%": { opacity: "0", transform: "translateY(16px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "slide-in-right": {
                    "0%": { transform: "translateX(100%)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
                "slide-in-bottom": {
                    "0%": { transform: "translateY(100%)" },
                    "100%": { transform: "translateY(0)" },
                },
                "zoom-in": {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 8px rgba(229, 62, 62, 0.2)" },
                    "50%": { boxShadow: "0 0 20px rgba(229, 62, 62, 0.4)" },
                },
                "shimmer": {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "scale-in": {
                    "0%": { opacity: "0", transform: "scale(0.9)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.3s ease-out forwards",
                "fade-in-up": "fade-in-up 0.4s ease-out forwards",
                "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
                "slide-in-bottom": "slide-in-bottom 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
                "zoom-in": "zoom-in 0.25s ease-out forwards",
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
                "shimmer": "shimmer 2s linear infinite",
                "scale-in": "scale-in 0.2s ease-out forwards",
            },
        },
    },
    plugins: [],
}
