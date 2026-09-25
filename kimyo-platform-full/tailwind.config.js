/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Duolingo-uslubidagi asosiy ranglar — keyinchalik UI promtlarida nozik sozlanadi
        primary: {
          DEFAULT: "#58CC02",
          dark: "#4CAF00",
        },
        secondary: {
          DEFAULT: "#1CB0F6",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
