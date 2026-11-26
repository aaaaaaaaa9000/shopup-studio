/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Cairo', 'system-ui', 'sans-serif'] },
      colors: {
        cream: { DEFAULT: '#F7F3EE', 100: '#FBF8F4', 200: '#EFE8DF', 300: '#E4DACE' },
        ink: { DEFAULT: '#1F1A17', soft: '#4A413B', muted: '#8A7F76' },
        wine: { DEFAULT: '#9C3548', dark: '#7F2A3A', soft: '#F5E6E9', line: '#E8C9D0' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,26,23,0.04), 0 8px 24px -12px rgba(31,26,23,0.12)',
        lift: '0 12px 40px -12px rgba(31,26,23,0.25)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: {
        shimmer: 'shimmer 2.2s linear infinite',
        fadeUp: 'fadeUp .35s ease-out both',
      },
    },
  },
  plugins: [],
};
