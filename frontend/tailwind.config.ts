import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: v("page"),
        surface: v("surface"),
        raised: v("raised"),
        ink: { DEFAULT: v("ink"), 2: v("ink-2"), muted: v("ink-muted") },
        line: v("line"),
        accent: { DEFAULT: v("accent"), soft: v("accent-soft"), ink: v("accent-ink") },
        good: v("good"),
        warn: v("warn"),
        bad: v("bad"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: { xl: "14px" },
    },
  },
  plugins: [],
};

export default config;
