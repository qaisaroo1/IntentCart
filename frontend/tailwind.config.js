/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paypal: {
          blue: "#0070BA",
          dark: "#003087",
          light: "#009CDE"
        }
      }
    },
  },
  plugins: [],
}
