import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        surface: "var(--surface)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted)",
        },
        foreground: "var(--text)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#1E201E",
        },
        cream: {
          DEFAULT: "var(--cream)",
          foreground: "#1E201E",
        },
        status: {
          applied: "#8A8B82",
          shortlisted: "#FCF8D8",
          invited: "#DD700B",
          interviewing: "#DD700B",
          interviewed: "#D9DADF",
          hired: "#8FD19E",
          rejected: "#E57373",
          on_hold: "#FCF8D8",
        },
      },
      boxShadow: {
        raised: "6px 6px 12px #151715, -6px -6px 12px #272927",
        inset: "inset 4px 4px 8px #151715, inset -4px -4px 8px #272927",
        "cta-glow": "0 4px 14px rgba(221, 112, 11, 0.4)",
        "cta-hover": "0 6px 20px rgba(221, 112, 11, 0.6)",
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
