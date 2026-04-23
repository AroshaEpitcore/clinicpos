/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        indigo: { DEFAULT: '#6366f1', dark: '#4f46e5' },
        cyan:   { DEFAULT: '#06b6d4' },
      },
    },
  },
  plugins: [],
};
