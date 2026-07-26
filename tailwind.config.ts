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
        cream: "#f7f1e5",
        muted: "#a38d78",
        gold: "#d5b56a",
        sage: "#7a8b68",
        rust: "#c96a2d",
        // Not in the PRD palette table, but needed for body-text contrast
        // against the cream background (muted alone fails WCAG AA).
        ink: "#332a20",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
