import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F5F3EE',
        ink: '#0E0E0E',
        ink2: '#1C1C1A',
        muted: '#7A766E',
        line: '#E3DFD6',
        card: '#FFFFFF',
        accent: '#B6754C',
        'accent-ink': '#FFFFFF',
        dark: '#0E0E0E',
        'dark-card': '#161614',
        'dark-line': '#2A2824',
        'dark-muted': '#8C8A83'
      },
      fontFamily: {
        ui: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', '"Times New Roman"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      borderRadius: {
        xs: '6px',
        s: '8px',
        m: '10px',
        l: '12px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '22px'
      },
      boxShadow: {
        card: '0 8px 30px rgba(14,14,14,0.06)',
        fab: '0 6px 16px rgba(0,0,0,0.15)',
        'fab-dark': '0 6px 16px rgba(0,0,0,0.4)'
      }
    }
  },
  plugins: []
};

export default config;
