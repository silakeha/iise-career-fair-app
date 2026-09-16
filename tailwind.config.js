/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'iise-navy': '#003366', // IISE Navy Blue
          'iise-gold': '#FFB81C', // IISE Gold
          'iise-blue': '#004C97', // IISE Blue (slightly lighter navy)
        },
      },
    },
    plugins: [],
  }