/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glossy: '0 20px 60px rgba(107, 76, 171, 0.14), 0 4px 18px rgba(107, 76, 171, 0.08)',
      },
    },
  },
  plugins: [],
}
