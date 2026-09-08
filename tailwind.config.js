/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Serif SC"', 'serif'],
        body: ['"Noto Serif SC"', '"Cormorant Garamond"', 'serif'],
        ui: ['"Outfit"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#2b2419',
        parch: '#f4ecdb',
        parch2: '#e9dcc2',
        brass: '#b8873f',
        brassLight: '#d9ae63',
        wine: '#7b3b46',
        moss: '#5f6b46',
        dusk: '#3c3550',
      },
      boxShadow: {
        card: '0 2px 0 rgba(43,36,25,0.18), 0 10px 30px -12px rgba(43,36,25,0.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(43,36,25,0.12)',
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        sheen: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        coinPop: {
          '0%': { transform: 'translateY(0) scale(0.8)', opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { transform: 'translateY(-28px) scale(1)', opacity: '0' },
        },
      },
      animation: {
        floatUp: 'floatUp .45s cubic-bezier(.2,.8,.2,1) both',
        sheen: 'sheen 2.6s linear infinite',
        pulseSoft: 'pulseSoft 2.2s ease-in-out infinite',
        coinPop: 'coinPop 1.1s ease-out forwards',
      },
    },
  },
  plugins: [],
};
