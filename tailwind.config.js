/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep Space Slate palette (PRD §2.1)
        base: "#0f172a",
        surface: "#1e293b",
        surface2: "#111827",
        ink: "#020617",
        line: "#334155",
        cyan: "#38bdf8",
        indigo: "#818cf8",
        rose: "#f43f5e",
        amber: "#f59e0b",
        mist: "#cbd5e1",
        muted: "#64748b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(56, 189, 248, 0.35)",
        "glow-rose": "0 0 24px -6px rgba(244, 63, 94, 0.4)",
      },
      backdropBlur: {
        glass: "16px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s linear infinite",
        floaty: "floaty 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
