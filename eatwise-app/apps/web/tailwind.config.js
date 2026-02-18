/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ]
  },
  theme: {
    extend: {
      colors: {
        primary: "#667eea",
        "primary-dark": "#5a6edc",
        secondary: "#764ba2",
      },
    },
  },
  plugins: [],
}

