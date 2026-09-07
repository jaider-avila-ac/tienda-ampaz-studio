/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Paleta Ampaz Studio ──────────────────────────────────────────────
        // Cambiar SOLO estos valores para actualizar el color en toda la app.
        // accent        → color principal de marca (#7B5F30): fondo de botones CTA, badges, highlights
        // accent-dark   → variante oscura de accent, para hover de botones CTA
        // complementario→ color complementario de marca (#B69A6A): degradados, acentos secundarios
        // aux           → fondo auxiliar (#F5F5F3): reemplaza el gris de fondo por defecto
        // black         → se sobreescribe el negro puro de Tailwind por #111111 (texto y contraste
        //                  de marca); esto reskinea automáticamente TODAS las clases bg-black/
        //                  text-black/border-black ya usadas en toda la app, sin tocar cada archivo.
        // ────────────────────────────────────────────────────────────────────
        accent:          '#7B5F30',
        'accent-dark':   '#695129',
        complementario:  '#B69A6A',
        aux:             '#F5F5F3',
        black:           '#111111',
      },
    },
  },
  plugins: [],
}