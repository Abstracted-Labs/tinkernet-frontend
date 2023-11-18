/** @type {import('tailwindcss').Config} */

const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [ "./src/**/*.{js,jsx,ts,tsx}" ],
  theme: {
    extend: {
      scrollbar: [ 'dark' ],
      fontFamily: {
        sans: [ "Inter var", ...defaultTheme.fontFamily.sans ],
      },
      fontSize: {
        'xxs': '0.5rem',
      },
    },
  },
  plugins: [ require("@tailwindcss/forms"), require('tailwind-scrollbar') ],
};
