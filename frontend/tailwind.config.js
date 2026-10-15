/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF6EE',
          200: '#F3ECE0',
          300: '#E8DEC9',
        },
        forest: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          500: '#52B788',
          600: '#40916C',
          700: '#2D6A4F',
          800: '#1B4332',
          900: '#081C15',
        },
        parchment: '#F5EFEB',
        libraryGold: '#C59B27',
      },
      fontFamily: {
        serif: ['Newsreader', 'Merriweather', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(27, 67, 50, 0.05), 0 2px 6px -1px rgba(27, 67, 50, 0.03)',
        'card-hover': '0 12px 30px -4px rgba(27, 67, 50, 0.12), 0 4px 10px -2px rgba(27, 67, 50, 0.06)',
      }
    },
  },
  plugins: [],
}
