/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0d0e12',
        surface: '#15171e',
        raised: '#1a1d26',
        line: '#262a36',
        'line-soft': '#1e222d',
        ink: '#e9ebf1',
        'ink-2': '#9aa1b2',
        'ink-3': '#6b7282',
        accent: '#7c5cff',
        'accent-2': '#a78bfa',
        ok: '#34d399',
        warn: '#fbbf24',
        bad: '#fb7185',
      },
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}