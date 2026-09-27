/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.7)" },
          "60%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        "ping-once": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "50%": { transform: "scale(1.3)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px) rotate(-2deg)" },
          "40%": { transform: "translateX(6px) rotate(2deg)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        "coin-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(1080deg)" },
        },
        "loading-bar": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out forwards",
        "pop-in": "pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "ping-once": "ping-once 0.5s ease-out forwards",
        shake: "shake 0.4s ease-in-out",
        "coin-flip": "coin-flip 1.4s cubic-bezier(0.45,0,0.55,1) forwards",
        "loading-bar": "loading-bar 2s ease-in-out forwards",
      },
    },
  },
  plugins: [],
};
