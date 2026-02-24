/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/client/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'rgb(var(--bg-base) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          raised: 'rgb(var(--bg-raised) / <alpha-value>)',
          overlay: 'rgb(var(--bg-overlay) / <alpha-value>)',
          wash: 'rgb(var(--bg-wash) / <alpha-value>)'
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)'
        },
        border: {
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
          accent: 'rgb(var(--border-accent) / <alpha-value>)'
        },
        primary: {
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)'
        },
        accent: {
          50: 'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)'
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        'success-subtle': 'rgb(var(--success-subtle) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        'warning-subtle': 'rgb(var(--warning-subtle) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        'error-subtle': 'rgb(var(--error-subtle) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
        'info-subtle': 'rgb(var(--info-subtle) / <alpha-value>)',
        area: {
          1: 'rgb(var(--area-1) / <alpha-value>)',
          2: 'rgb(var(--area-2) / <alpha-value>)',
          3: 'rgb(var(--area-3) / <alpha-value>)',
          4: 'rgb(var(--area-4) / <alpha-value>)',
          5: 'rgb(var(--area-5) / <alpha-value>)',
          6: 'rgb(var(--area-6) / <alpha-value>)',
          7: 'rgb(var(--area-7) / <alpha-value>)',
          8: 'rgb(var(--area-8) / <alpha-value>)'
        }
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      spacing: {
        '4.5': '1.125rem',
        '7.5': '1.875rem',
        18: '4.5rem'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)'
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'glow-primary': 'var(--glow-primary)',
        'glow-accent': 'var(--glow-accent)',
        'glow-success': 'var(--glow-success)'
      },
      transitionDuration: {
        instant: '75ms',
        fast: '150ms',
        normal: '250ms',
        slow: '400ms',
        slower: '600ms'
      },
      transitionTimingFunction: {
        'ease-in-out': 'var(--ease-in-out)',
        'ease-out': 'var(--ease-out)',
        'ease-in': 'var(--ease-in)',
        bounce: 'var(--ease-bounce)',
        spring: 'var(--ease-spring)'
      },
      zIndex: {
        base: '0',
        raised: '10',
        sticky: '20',
        sidebar: '20',
        dropdown: '40',
        overlay: '50',
        modal: '60',
        toast: '70',
        command: '80'
      }
    }
  },
  plugins: []
};
