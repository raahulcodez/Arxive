/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#121212", // Deep Space Black
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#00E5FF", // Electric Blue
          foreground: "#121212", // Deep Space Black for contrast
        },
        secondary: {
          DEFAULT: "#00BFA5", // Cyber Teal
          foreground: "#121212", // Deep Space Black for contrast
        },
        accent: {
          DEFAULT: "#9D5CFF", // Neon Purple
          foreground: "#121212", // Deep Space Black for contrast
        },
        destructive: {
          DEFAULT: "#FF5252", // Coral Red
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#1A1A2E", // Dark Indigo
          foreground: "#A0A0A0", // Light gray for muted text
        },
        success: {
          DEFAULT: "#39D98A", // Mint Green
          foreground: "#121212", // Deep Space Black for contrast
        },
        warning: {
          DEFAULT: "#FFC107", // Digital Amber
          foreground: "#121212", // Deep Space Black for contrast
        },
        sidebar: {
          DEFAULT: "#1A1A2E", // Dark Indigo
          foreground: "#FFFFFF", // White for sidebar text
          border: "#2A2A4E", // Slightly lighter indigo for borders
          ring: "#00E5FF", // Electric Blue for focus rings
          accent: "#2A2A4E", // Slightly lighter indigo for accents
          "accent-foreground": "#FFFFFF", // White for accent text
        },
        popover: {
          DEFAULT: "#1A1A2E", // Dark Indigo
          foreground: "#FFFFFF", // White for popover text
        },
        card: {
          DEFAULT: "#1A1A2E", // Dark Indigo
          foreground: "#FFFFFF", // White for card text
        },
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
        glow: {
          "0%, 100%": {
            textShadow: "0 0 5px rgba(0, 229, 255, 0.5), 0 0 15px rgba(0, 229, 255, 0.3)",
          },
          "50%": {
            textShadow: "0 0 20px rgba(0, 229, 255, 0.8), 0 0 30px rgba(0, 229, 255, 0.5)",
          },
        },
        pulse: {
          "0%, 100%": {
            boxShadow: "0 0 5px rgba(0, 229, 255, 0.5), 0 0 10px rgba(0, 229, 255, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 15px rgba(0, 229, 255, 0.8), 0 0 25px rgba(0, 229, 255, 0.5)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        glow: "glow 2s ease-in-out infinite",
        pulse: "pulse 2s ease-in-out infinite",
      },
      backgroundImage: {
        "cyber-grid": "linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px)",
        "cyber-gradient": "linear-gradient(135deg, #1A1A2E 0%, #121212 100%)",
      },
      backgroundSize: {
        grid: "20px 20px",
      },
    },
  },
  plugins: [],
} 