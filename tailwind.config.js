/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // aktiviere Dark Mode 'class' für v4
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Benutzerdefinierte Farben für Netzwerkkomponenten
        router: "#FF6B6B",
        switch: "#4ECDC4",
        server: "#1A535C",
        firewall: "#FF9F1C",
        cloud: "#5C80BC",
        pc: "#4B4E6D",
        accessPoint: "#6B818C",
        annotation: "#9B59B6"
      }
    },
  },
  future: {
    // Zukunftsfunktionen für v4
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
}