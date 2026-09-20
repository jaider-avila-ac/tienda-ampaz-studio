/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Paleta Duo Chic Studio ───────────────────────────────────────────
        // Cambiar SOLO estos valores para actualizar el color en toda la app.
        // accent        → color principal de marca y del logo (#775015): fondo de botones CTA, badges, highlights
        // accent-dark   → variante oscura de accent, para hover de botones CTA
        // complementario→ color complementario de marca (#EADACA): degradados, acentos secundarios
        // aux           → fondo auxiliar de toda la página — variante suave (60% blanco + 40%
        //                  complementario) del #EADACA de la paleta, no el color plano. Con
        //                  aux=blanco puro la página se veía plana/vacía sin contenido; este tono
        //                  cálido le da cuerpo incluso cuando no hay productos que mostrar. Las
        //                  tarjetas/superficies (header, footer, product cards) siguen en blanco
        //                  puro (bg-white) a propósito, para que floten sobre este fondo.
        // black         → se sobreescribe el negro puro de Tailwind por #111111 (texto y contraste
        //                  de marca); esto reskinea automáticamente TODAS las clases bg-black/
        //                  text-black/border-black ya usadas en toda la app, sin tocar cada archivo.
        // ────────────────────────────────────────────────────────────────────
        accent:          '#775015',
        'accent-dark':   '#654512',
        complementario:  '#EADACA',
        aux:             '#F7F0EA',
        black:           '#111111',
      },
    },
  },
  plugins: [],
}