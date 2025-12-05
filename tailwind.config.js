/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#f97316', // Orange-500
          light: '#fb923c',   // Orange-400
          dark: '#ea580c',    // Orange-600
        },
        secondary: {
          DEFAULT: '#ef4444', // Red-500
          light: '#f87171',   // Red-400
          dark: '#dc2626',    // Red-600
        },
        slate: {
          50: '#f9fafb',      // Very light gray for backgrounds
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',     // Secondary text
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',     // Primary text
          900: '#111827',
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(249, 115, 22, 0.3)',
      }
    }
  },
  plugins: [],
}