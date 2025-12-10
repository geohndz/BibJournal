/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.04em',
      },
      colors: {
        primary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#000000',
          700: '#000000',
          800: '#000000',
          900: '#000000',
        },
      },
      keyframes: {
        'pop-out-1': {
          '0%': {
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(0.3) rotate(-3deg)',
          },
          '50%': {
            transform: 'translate(-50%, -50%) scale(1.1) rotate(-3deg)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate(calc(-50% - 80px), -50%) scale(1) rotate(-3deg)',
          },
        },
        'pop-out-2': {
          '0%': {
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(0.3) rotate(2deg)',
          },
          '50%': {
            transform: 'translate(-50%, -50%) scale(1.1) rotate(2deg)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate(calc(-50% + 80px), calc(-50% - 60px)) scale(1) rotate(2deg)',
          },
        },
        'pop-out-3': {
          '0%': {
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(0.3) rotate(-1deg)',
          },
          '50%': {
            transform: 'translate(-50%, -50%) scale(1.1) rotate(-1deg)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate(-50%, calc(-50% + 80px)) scale(1) rotate(-1deg)',
          },
        },
      },
      animation: {
        'pop-out-1': 'pop-out-1 0.6s ease-out 0.1s both',
        'pop-out-2': 'pop-out-2 0.6s ease-out 0.2s both',
        'pop-out-3': 'pop-out-3 0.6s ease-out 0.3s both',
      },
    },
  },
  plugins: [],
}
