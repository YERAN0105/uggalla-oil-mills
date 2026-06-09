import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — defined as CSS variables in globals.css
        green: {
          DEFAULT: "var(--color-green)",
          deep: "var(--color-green-deep)",
          50: "#f0f7f2",
          100: "#daeee1",
          200: "#b8ddc6",
          300: "#8dc5a4",
          400: "#5fa87d",
          500: "var(--color-green)",   // #1B6B3A
          600: "#165530",
          700: "var(--color-green-deep)", // #123524
          800: "#0e2a1d",
          900: "#081a12",
        },
        gold: {
          DEFAULT: "var(--color-gold)",
          warm: "var(--color-gold-warm)",
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "var(--color-gold)",     // #F6C026
          500: "var(--color-gold-warm)", // #E0A92E
          600: "#b8861e",
          700: "#926813",
          800: "#6b4d0e",
          900: "#453208",
        },
        cream: "var(--color-cream)",
        sand: "var(--color-sand)",
        sage: "var(--color-sage)",
        // shadcn/ui semantic tokens
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        shimmer: "shimmer 1.5s infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
