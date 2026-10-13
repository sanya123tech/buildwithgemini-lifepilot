/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070b14',
          900: '#0b1325',
          850: '#101a33',
          800: '#152445',
          750: '#1c2e56',
          700: '#233869',
          600: '#324e8f',
        },
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)' },
          '100%': { boxShadow: '0 0 25px rgba(139, 92, 246, 0.3)' },
        }
      }
    },
  },
  plugins: [],
}
