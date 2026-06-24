/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scoped only to the new React source tree so Tailwind's JIT scanner
  // never touches legacy js/*.js or index.html class names.
  content: ['./src/mushaira-room/**/*.{ts,tsx}'],
  // Every utility becomes mr-flex, mr-bg-mr-gold, etc. — this is the real
  // collision firewall against the hand-written classes in css/main.css.
  prefix: 'mr-',
  // main.css already provides its own resets (lines ~40-134). Tailwind's
  // bare-element preflight reset would otherwise leak into the rest of the
  // vanilla site since both stylesheets share one <head>.
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        'mr-bg': '#0B0B0F',
        'mr-bg-secondary': '#13131A',
        'mr-purple': '#6B21A8',
        'mr-gold': '#D4AF37',
        'mr-gold-light': '#E8C966',
        'mr-white': '#FFFFFF',
        'mr-muted': '#B3B3B3'
      },
      fontFamily: {
        'mr-sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mr-urdu': ['Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'serif']
      },
      boxShadow: {
        'mr-gold-glow': '0 0 24px rgba(212,175,55,0.3)',
        'mr-gold-glow-lg': '0 0 48px rgba(212,175,55,0.35)',
        'mr-purple-glow': '0 0 24px rgba(107,33,168,0.45)'
      },
      backgroundImage: {
        'mr-gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #E8C966 50%, #B8962E 100%)',
        'mr-purple-gradient': 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)'
      },
      animation: {
        'mr-float': 'mr-float 6s ease-in-out infinite',
        'mr-pulse-gold': 'mr-pulse-gold 2s ease-in-out infinite',
        'mr-shimmer': 'mr-shimmer 2.5s linear infinite'
      },
      keyframes: {
        'mr-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' }
        },
        'mr-pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,175,55,0.45)' },
          '50%': { boxShadow: '0 0 0 10px rgba(212,175,55,0)' }
        },
        'mr-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
};
