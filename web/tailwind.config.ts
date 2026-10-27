import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1F1D19",
          muted: "#5C5546",
          faint: "#9A917F",
        },
        paper: {
          DEFAULT: "#F6F1E7",
          deep: "#ECE7DB",
          line: "#D9D2C0",
          wash: "#F0E9D9",
        },
        seal: {
          DEFAULT: "#9E3B33",
        },
      },
      fontFamily: {
        display: [
          '"Songti SC"',
          "STSong",
          "SimSun",
          '"Noto Serif SC"',
          "serif",
        ],
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
