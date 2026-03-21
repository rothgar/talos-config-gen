/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        // Omni / Talos color palette
        bg: '#101118',
        surface: '#13141c',
        'surface-2': '#1c1d27',
        'surface-3': '#24253200',
        border: '#2b2c3a',
        'border-2': '#3d3e50',
        muted: '#9fa1a6',
        text: '#e2e2e2',
        primary: '#ff6b35',
        'primary-dark': '#cc5529',
        green: '#69c297',
        'green-dark': '#3d7a5e',
        red: '#ff5c56',
        'red-dark': '#7a2522',
        yellow: '#ffb200',
        'yellow-dark': '#7a5500',
        blue: '#59a5ff',
        'blue-dark': '#1a4a80',
      },
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
