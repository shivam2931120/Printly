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
                    DEFAULT: '#050505', // True Black
                    card: '#141414',
                    subtle: '#0E0E0E',
                    dark: '#0A0A0A', // Added for auth inputs
                    darker: '#020202', // Added for auth page bg
                },
                border: {
                    DEFAULT: '#242424',
                    subtle: '#1A1A1A',
                    dark: '#2A2A2A', // Added for auth inputs
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#B5B5B5',
                    muted: '#7A7A7A',
                },
                accent: {
                    DEFAULT: '#FFFFFF',
                    hover: '#E5E5E5',
                    foreground: '#000000',
                },
                // Maintaining semantic aliases for compatibility but mapping to new theme
                primary: {
                    DEFAULT: '#FFFFFF',
                    foreground: '#000000',
                    hover: '#E5E5E5',
                },
                surface: {
                    light: '#FFFFFF', // Keeping for potential light mode legacy, though we are strict dark
                    dark: '#141414',
                    darker: '#050505',
                },
                // Functional colors
                success: '#22C55E',
                warning: '#F59E0B',
                error: '#EF4444',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                display: ['Source Sans 3', 'Inter', 'ui-sans-serif', 'system-ui'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                'lg': '0.5rem',
                'xl': '0.75rem',
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
            boxShadow: {
                'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 20px rgba(255, 255, 255, 0.05)', // Subtle white glow
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
                "fade-in": "fade-in 0.2s ease-out forwards", // Faster 200ms
                "slide-in-right": "slide-in-right 0.25s ease-out forwards",
                "slide-in-bottom": "slide-in-bottom 0.25s ease-out forwards",
                "zoom-in": "zoom-in 0.2s ease-out forwards",
            },
        },
    },
    plugins: [],
}
