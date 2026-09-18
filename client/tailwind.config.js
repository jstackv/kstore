/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1C2430',
        paper: '#F3F4EF',
        vault: {
          DEFAULT: '#2F6B5E',
          dark: '#234F45',
          light: '#E4EDEA',
        },
        brass: {
          DEFAULT: '#A9814A',
          light: '#F1E9DA',
        },
        slate: {
          DEFAULT: '#6B7280',
        },
        rust: '#B0523A',
      },
      fontFamily: {
        serif: ['"Lora"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
