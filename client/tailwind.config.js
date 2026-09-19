/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // CSS-variable-driven so light/dark mode flips every usage of these
        // tokens app-wide via the .dark class on <html>, without touching
        // every component file. See index.css for the :root / .dark values.
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        slate: {
          DEFAULT: 'rgb(var(--color-slate) / <alpha-value>)',
        },
        night: {
          900: '#0F1024',
          800: '#181A35',
          700: '#22254A',
        },
        vault: {
          DEFAULT: '#4F46E5',
          dark: '#4338CA',
          light: 'rgb(var(--color-vault-light) / <alpha-value>)',
          glow: '#6366F1',
        },
        brass: {
          DEFAULT: '#B45309',
          light: '#FDF1E1',
        },
        aqua: {
          DEFAULT: '#0F9C87',
          light: '#E1F6F2',
        },
        rust: '#DC2626',
      },
      fontFamily: {
        // Single typeface everywhere - `font-serif` stays available in class
        // names for headings but resolves to the same family, so headings and
        // body text both render in Plus Jakarta Sans.
        serif: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,18,43,0.04), 0 10px 30px -12px rgba(18,18,43,0.12)',
        lift: '0 2px 6px rgba(18,18,43,0.06), 0 24px 48px -16px rgba(67,56,202,0.28)',
        glow: '0 10px 28px -8px rgba(79,70,229,0.45)',
        modal: '0 40px 100px -24px rgba(15,16,36,0.55)',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.96) translateY(8px)' },
          to: { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        toastIn: {
          from: { opacity: 0, transform: 'translateX(24px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(320%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--r, 0deg))' },
          '50%': { transform: 'translateY(-10px) rotate(var(--r, 0deg))' },
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: 0 },
          '70%': { transform: 'scale(1.12)', opacity: 1 },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out both',
        'slide-up': 'slideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scaleIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toastIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        indeterminate: 'indeterminate 1.3s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        pop: 'pop 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
