/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B1020',
          50: '#F5F6FA',
          100: '#EAEDF4',
          200: '#D5DAE6',
          300: '#AEB6C9',
          400: '#7C86A2',
          500: '#3A4466',
          600: '#263052',
          700: '#1A2340',
          800: '#111830',
          900: '#0B1020',
        },
        paper: {
          DEFAULT: '#F7F7FB',
          soft: '#FBFBFE',
          line: '#E8E8F2',
        },
        brand: {
          50: '#EEF0FF',
          100: '#E0E4FF',
          200: '#C6CCFF',
          300: '#A3ABFF',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        violet: {
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        mint: {
          400: '#34D399',
          500: '#10B981',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans Thai"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Noto Sans Thai"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 32px -12px rgba(16, 24, 40, 0.12)',
        lift: '0 2px 4px rgba(16, 24, 40, 0.04), 0 28px 48px -20px rgba(49, 46, 129, 0.28)',
        glow: '0 0 0 1px rgba(99, 102, 241, 0.18), 0 24px 60px -24px rgba(79, 70, 229, 0.55)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      backgroundImage: {
        'grid-light':
          'linear-gradient(to right, rgba(11,16,32,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,16,32,0.055) 1px, transparent 1px)',
        'grid-dark':
          'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
        'brand-gradient': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 55%, #2563EB 100%)',
        'soft-fade': 'radial-gradient(ellipse at top, #EEF0FF 0%, #F7F7FB 55%, #F7F7FB 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
}
