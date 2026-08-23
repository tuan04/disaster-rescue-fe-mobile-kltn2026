/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./contants/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./services/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}",
    "./types/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: ["dark"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        background: "var(--background)",
        surface: "var(--surface)",
        danger: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        md: ["0.9375rem", { lineHeight: "1.25rem" }],
        "title-sm": ["1.25rem", { lineHeight: "1.75rem" }],
        "title-md": ["1.375rem", { lineHeight: "1.875rem" }],
        title: ["1.5rem", { lineHeight: "2rem" }],
        heading: ["2rem", { lineHeight: "2.5rem" }],
        display: ["2.5rem", { lineHeight: "3rem" }],
      },
    },
  },
  plugins: [],
};
