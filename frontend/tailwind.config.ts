import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tertiary-fixed-dim": "#9ecfd1",
        "secondary": "#0f62fe",
        "error": "#ba1a1a",
        "secondary-fixed": "#f4dfce",
        "surface": "#ffffff",
        "on-primary": "#ffffff",
        "on-tertiary-fixed-variant": "#1a4e50",
        "inverse-surface": "#123441",
        "tertiary": "#1c4f51",
        "surface-container-lowest": "#ffffff",
        "on-primary-fixed-variant": "#324e2a",
        "primary-fixed": "#caecbc",
        "surface-dim": "#e7eee4",
        "primary-container": "#ffe8ed",
        "on-surface": "#1f2933",
        "surface-tint": "#ff385c",
        "tertiary-container": "#366769",
        "on-tertiary": "#ffffff",
        "surface-container-high": "#f1f3f5",
        "on-primary-fixed": "#062104",
        "surface-container-highest": "#e2eadf",
        "surface-bright": "#fffaf2",
        "surface-container": "#f7f2e9",
        "on-tertiary-container": "#b1e3e5",
        "on-secondary-fixed-variant": "#524438",
        "on-surface-variant": "#434840",
        "tertiary-fixed": "#b9ecee",
        "background": "#ffffff",
        "on-secondary": "#ffffff",
        "on-primary-container": "#c2e4b4",
        "primary-fixed-dim": "#afd0a1",
        "primary": "#ff385c",
        "secondary-container": "#f4dfce",
        "outline-variant": "#c3c8bd",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "inverse-on-surface": "#dff4ff",
        "on-background": "#001f29",
        "on-tertiary-fixed": "#002021",
        "inverse-primary": "#afd0a1",
        "on-secondary-container": "#716154",
        "outline": "#73796f",
        "on-error": "#ffffff",
        "on-secondary-fixed": "#24190f",
        "surface-variant": "#eef3ef",
        "surface-container-low": "#ffffff",
        "secondary-fixed-dim": "#d7c3b3"
      },
      fontFamily: {
        "display": ["Manrope", "SF Pro Display", "system-ui", "sans-serif"],
        "headline": ["Manrope", "sans-serif"],
        "body": ["\"IBM Plex Sans\"", "system-ui", "-apple-system", "sans-serif"],
        "label": ["\"IBM Plex Sans\"", "system-ui", "-apple-system", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [
    forms,
  ],
} satisfies Config
