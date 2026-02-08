/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: {
                    light: '#f6f7f8',
                    dark: '#0E0E10', // Main Background
                },
                surface: {
                    light: '#ffffff',
                    dark: '#1A1A1D', // Card Background
                    darker: '#111113', // Sidebar/Navbar
                },
                border: {
                    light: '#e2e8f0',
                    dark: '#27272A', // Border/Divider
                },
                primary: {
                    DEFAULT: '#4F46E5', // Indigo
                    hover: '#6366F1',   // Secondary Accent
                    foreground: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#6366F1',
                    foreground: '#FFFFFF',
                },
                success: '#22C55E',
                warning: '#F59E0B',
                error: '#EF4444',
                slate: {
                    850: '#141417', // Secondary Background
                    900: '#0E0E10', // Main Background overlap
                    950: '#020617',
                }
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
                display: ['Inter', 'ui-sans-serif', 'system-ui'],
            },
            borderRadius: {
                'xl': '1rem', // 16px
                '2xl': '1.25rem', // 20px
            }
        },
    },
    plugins: [],
}
