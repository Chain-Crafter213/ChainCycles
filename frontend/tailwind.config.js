/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neon colors
        'neon-cyan': '#00ffff',
        'neon-magenta': '#ff00ff',
        'neon-blue': '#0080ff',
        'neon-green': '#00ff80',
        'neon-orange': '#ff8000',
        'neon-red': '#ff0040',
        // Background
        'grid-dark': '#0a0a12',
        'grid-line': '#1a1a2e',
        'panel-bg': '#0d0d1a',
        'panel-border': '#2a2a4a',
      },
      fontFamily: {
        'display': ['Outfit', 'Space Grotesk', 'sans-serif'],
        'mono': ['Space Grotesk', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'grid-flow': 'grid-flow 20s linear infinite',
        'trail-pulse': 'trail-pulse 0.5s ease-in-out infinite',
        'countdown': 'countdown 1s ease-out',
        'explosion': 'explosion 0.5s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.2)' },
        },
        'grid-flow': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '50px 50px' },
        },
        'trail-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'countdown': {
          '0%': { transform: 'scale(2)', opacity: '0' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        'explosion': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff',
        'neon-magenta': '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff',
        'neon-glow': '0 0 20px currentColor',
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(to right, var(--tw-colors-grid-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--tw-colors-grid-line) 1px, transparent 1px)
        `,
      },
    },
  },
  plugins: [],
}
