/** @type {import('tailwindcss').Config} */

const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [ "./src/**/*.{js,jsx,ts,tsx}" ],
  theme: {
    extend: {
      colors: {
        tinkerYellow: '#f8ce46',
        tinkerGrey: '#202125', // Project card bg
        tinkerLightGrey: '#2D2E34', // Selected active account bg
        tinkerDarkGrey: '#16171b', // Project desc bg
        tinkerTextGrey: '#7b7d84', // Card text
      },
      scrollbar: [ 'dark' ],
      fontFamily: {
        sans: [ "InterVariable", ...defaultTheme.fontFamily.sans ],
      },
      fontSize: {
        'xxs': '0.5rem',
      },
      keyframes: {
        colorChange: {
          '0%': { backgroundColor: '#8B5CF6' }, // purple
          '15%': { backgroundColor: '#D946EF' }, // violet
          '30%': { backgroundColor: '#F59E0B' }, // orange
          '45%': { backgroundColor: '#FCD34D' }, // amber
          '60%': { backgroundColor: '#FBBF24' }, // yellow
          '75%': { backgroundColor: '#34D399' }, // teal
          '90%': { backgroundColor: '#60A5FA' }, // light blue
          '100%': { backgroundColor: '#8B5CF6' }, // back to purple
        },
      },
      animation: {
        colorChange: 'colorChange 13s infinite',
      },
    },
  },
  plugins: [ require("@tailwindcss/forms"), require('tailwind-scrollbar') ],
};
