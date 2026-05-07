/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#1D9E75',
          light: '#9FE1CB',
        },
        mint: '#E1F5EE',
        navy: '#185FA5',
        gold: '#EF9F27',
        'ai-text': '#085041',
        'subtle': '#B4B2A9',
        'hero-end': '#E6F1FB',
        'error': '#E24B4A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        heading: '-0.2px',
        tagline: '3px',
      },
      borderRadius: {
        pill: '99px',
        card: '10px',
        sm: '4px',
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(29,158,117,0.08)',
      },
    },
  },
  plugins: [],
}
