/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bsPrimary: {
          700: '#2563EB',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        bsSecondary: {
          cyan: '#06B6D4',
          sky: '#0EA5E9',
          indigo: '#4F46E5',
        },
        bsStatus: {
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
          offline: '#6B7280',
        },
        bsBg: {
          light: '#F8FAFC',
          dark: '#020617',
        },
        bsSurface: {
          light: '#FFFFFF',
          dark: '#0F172A',
        },
        bsSecSurface: {
          light: '#F1F5F9',
          dark: '#1E293B',
        },
        bsText: {
          primaryLight: '#0F172A',
          primaryDark: '#F8FAFC',
          secondaryLight: '#475569',
          secondaryDark: '#94A3B8',
          hint: '#94A3B8',
          disabled: '#CBD5E1',
        },
        bdlContext: {
          operations: '#22C55E',
          finance: '#F59E0B',
          customers: '#2563EB',
          delivery: '#06B6D4',
          kitchen: '#F97316',
          ai: '#4F46E5',
          security: '#EF4444',
          offline: '#6B7280',
        }
      },
      borderRadius: {
        'bs-sm': '8px',
        'bs-md': '12px',
        'bs-card': '18px',
        'bs-sheet': '24px',
        'bs-dialog': '24px',
        'bs-floating': '28px',
        'bs-btn': '16px',
      },
      boxShadow: {
        'bs-low': '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'bs-md': '0 6px 12px -2px rgba(0, 0, 0, 0.1)',
        'bs-high': '0 12px 24px -4px rgba(0, 0, 0, 0.15)',
        'bdl-glow-indigo': '0 0 20px -2px rgba(79, 70, 229, 0.4)',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
