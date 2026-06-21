/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          active: '#2d2d2d',
          border: '#3e3e3e',
          text: '#d4d4d4',
          accent: '#007acc',
          tab: '#1e1e1e',
          tabActive: '#2d2d2d',
          statusbar: '#007acc',
        },
      },
      fontFamily: {
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        emojiFloat: {
          '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
          '50%': { transform: 'translate(-50%, -150%) scale(1.5)', opacity: 1 },
          '100%': { transform: 'translate(-50%, -250%) scale(1)', opacity: 0 },
        },
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-out',
        emojiFloat: 'emojiFloat 2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
