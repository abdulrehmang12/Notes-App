/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#1f2328",
        paper: "#fbfaf7",
        moss: "#496651",
        clay: "#c07155",
        amber: "#f4bd61",
        mist: "#e8edf0"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(31, 35, 40, 0.12)"
      }
    }
  },
  plugins: []
};
