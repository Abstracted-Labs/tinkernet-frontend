/** @type {import('tailwindcss').Config} */

const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [ "./src/**/*.{js,jsx,ts,tsx}" ],
  theme: {
    extend: {
      colors: {
        tinkerYellow: '#f8ce46',
        tinkerGrey: '#202125', // Project card bg
        tinkerDarkGrey: '#16171b', // Project desc bg
      },
      scrollbar: [ 'dark' ],
      fontFamily: {
        sans: [ "InterVariable", ...defaultTheme.fontFamily.sans ],
      },
      fontSize: {
        'xxs': '0.5rem',
      },
    },
  },
  plugins: [ require("@tailwindcss/forms"), require('tailwind-scrollbar') ],
};
