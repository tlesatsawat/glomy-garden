import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          bg: "#2d3436",
          ui: "#1e272e",
          accent: "#00b894",
          danger: "#d63031",
          gold: "#fdcb6e",
          soil: "#8d6e63",
        },
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "bounce-slight": "bounce-slight 2s infinite",
      },
      keyframes: {
        "bounce-slight": {
          "0%, 100%": { transform: "translateY(-5%)" },
          "50%": { transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;