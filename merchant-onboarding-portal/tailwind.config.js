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
        brand: {
          50: '#e6f8ff',
          100: '#b3edff',
          200: '#80e2ff',
          300: '#4dd7ff',
          400: '#1accff',
          500: '#00b3e6',
          600: '#008cb3',
          700: '#006680',
          800: '#00404d',
          900: '#001a20',
          cyan: '#00F2FE',
          blue: '#4FACFE',
          accent: '#0066FF',
        },
        dark: {
          bg: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          hover: '#374151',
          surface: '#161F30',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 242, 254, 0.3)',
        'glow-blue': '0 0 25px -5px rgba(79, 172, 254, 0.3)',
      }
    },
  },
  plugins: [],
}
