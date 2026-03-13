import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "sans-serif"],
        body:    ["Inter", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
        inter:   ["Inter", "sans-serif"],
      },
      colors: {
        medical: {
          primary:    "#2563EB",
          dark:       "#1D4ED8",
          light:      "#EFF6FF",
          sidebar:    "#0F1E4A",
          teal:       "#14B8A6",
          "teal-lt":  "#F0FDFA",
          green:      "#10B981",
          "green-lt": "#ECFDF5",
          warning:    "#F59E0B",
          "warn-lt":  "#FFFBEB",
          danger:     "#EF4444",
          "danger-lt":"#FEF2F2",
          violet:     "#7C3AED",
          "violet-lt":"#FAF5FF",
          grey:       "#E5E7EB",
          text:       "#111827",
          muted:      "#6B7280",
          bg:         "#F8FAFC",
        },
        // Standard teal for anatomy / risk predictor pages
        teal: {
          50: "#F0FDFA", 100: "#CCFBF1", 200: "#99F6E4",
          300: "#5EEAD4", 400: "#2DD4BF", 500: "#14B8A6",
          600: "#0D9488", 700: "#0F766E", 800: "#115E59", 900: "#134E4A",
        },
      },
      animation: {
        "fade-up":     "fadeUp 0.4s ease forwards",
        "fade-in":     "fadeIn 0.3s ease forwards",
        "slide-right": "slideRight 0.35s ease forwards",
        "slide-left":  "slideLeft 0.35s ease forwards",
        "pulse-dot":   "pulseDot 1.4s ease-in-out infinite",
        "float":       "float 4s ease-in-out infinite",
        "shimmer":     "shimmer 1.8s linear infinite",
        "slide-up":    "slideUp 0.3s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideRight: {
          "0%":   { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideLeft: {
          "0%":   { opacity: "0", transform: "translateX(10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%":           { transform: "scale(1)",   opacity: "1"   },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)"    },
          "50%":      { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0"  },
        },
      },
    },
  },
  plugins: [],
};
export default config;
